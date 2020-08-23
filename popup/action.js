reload_window_list();
window.browser.windows.onCreated.addListener(event_handler(reload_window_list));
window.browser.windows.onRemoved.addListener(event_handler(reload_window_list));
window.browser.windows.onFocusChanged.addListener(event_handler(reload_window_list));

function event_handler(handler) {
    return function () {
        clear_messages();
        handler().catch((err) => show_message(err));
    }
}

async function reload_window_list() {
    let windows_el = document.querySelector("#windows");
    let window_list = await window.browser.windows.getAll({ populate: true });
    console.log(window_list);
    let html = "<h2>Windows</h2>";
    for (let win of window_list) {
        html += "<details class='window'" + (win.focused ? " style='underline:red;' open='true'" : "") + "><summary>" + win.title + (win.focused ? " (Active)" : "") + "</summary>";

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
                html += "<div>";
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
        html += "</details>"
    }
    windows_el.innerHTML = html;
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
