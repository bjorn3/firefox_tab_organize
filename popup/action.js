reload_window_list();
window.browser.windows.onCreated.addListener(event_handler(reload_window_list));
window.browser.windows.onRemoved.addListener(event_handler(reload_window_list));
window.browser.windows.onFocusChanged.addListener(event_handler(reload_window_list));

function event_handler(handler) {
    return function () {
        clear_messages();
        handler().catch((err) => {
            show_message(err);
            throw err;
        });
    }
}

function update_rendered_list(root_el, tag, prefix, elems, cb) {
    for (let el of root_el.querySelectorAll("." + prefix)) {
        if (el.id.indexOf(prefix + "-") != 0 || !elems.some((elem) => elem.id == el.id.substr(prefix + 1))) {
            console.log(el.id);
            root_el.removeChild(el);
        }
    }
    for (let elem of elems) {
        let el = document.getElementById(prefix + "-" + elem.id);
        if (!el) {
            el = document.createElement(tag);
            el.id = prefix + "-" + elem.id;
            el.classList.add(prefix);
            root_el.appendChild(el);
        }
        cb(elem, el);
    }
}

async function reload_window_list() {
    let window_list = await window.browser.windows.getAll({ populate: true });
    console.log(window_list);

    let windows_el = document.querySelector("#windows");
    update_rendered_list(windows_el, "details", "window", window_list, (win, win_el) => {
        for (let el of win_el.childNodes) {
            win_el.removeChild(el);
        }

        win_el.open = win.focused;
        let summary = document.createElement("summary");
        summary.textContent = win.title + (win.focused ? " (Active)" : "");
        win_el.appendChild(summary);

        let html = "";

        let host_tabs = {};
        for (let tab of win.tabs) {
            let host = (new URL(tab.url)).host || "other";
            if (host_tabs[host] === undefined) {
                host_tabs[host] = [];
            }
            host_tabs[host].push(tab);
        }

        for (let host in host_tabs) {
            host_tabs[host] = host_tabs[host].sort((a, b) => a.url > b.url);
        }

        console.log(host_tabs);

        for(let [host, tabs] of Object.entries(host_tabs).sort((a, b) => a[1].length < b[1].length)) {
            if (tabs.length > 1) {
                html += "<details><summary>" + host + " (" + tabs.length + ")"+ "</summary>";
            }
            for (let tab of tabs) {
                html += "<div id='tab-" + tab.id + " class='tab''>";
                if (tab.favIconUrl) {
                    html += "<img src='" + tab.favIconUrl + "' width='16' height='16'>";
                }
                html += tab.url;
                html += "</div>";
            }
            if (tabs.length > 1) {
                html += "</details>";
            }
        }
        win_el.innerHTML += html;
    });
}

document.querySelector("#discard").onclick = event_handler(async function () {
    let currentWindow = await window.browser.windows.getCurrent({ populate: true });
    await window.browser.tabs.discard(currentWindow.tabs.map((tab) => tab.id));
});

document.querySelector("#load_zulip").onclick = event_handler(async function () {
    let currentWindow = await window.browser.windows.getCurrent({ populate: true });
    let tabs = currentWindow.tabs.filter((tab) => tab.url.indexOf("zulipchat.com") !== -1);
    tabs.map((tab) => show_message(tab.url));
    await Promise.all(tabs.map((tab) => window.browser.tabs.reload(tab.id)));
});

document.querySelector("#reload").onclick = function () { window.location.reload(); };
document.querySelector("#hide").onclick = function () { window.close(); };

function clear_messages() {
    document.querySelector("#messages").textContent = "";
}

function show_message(msg) {
    document.querySelector("#messages").textContent += msg + "\n";
}