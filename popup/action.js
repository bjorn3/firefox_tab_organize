import { h, Component, render } from "../node_modules/preact/dist/preact.mjs";

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

async function reload_window_list() {
    let window_list = await window.browser.windows.getAll({ populate: true });
    console.log(window_list);

    let win_els = [];
    win_els.push(h("h2", {}, "Windows"));
    for (let win of window_list) {
        win_els.push(Window(win));
    }
    render(win_els, document.getElementById("windows"));
}

function Window(win) {
    let win_els = [];
    win_els.push(h("summary", {}, win.title + (win.focused ? " (Active)" : "")));

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

    for (let [host, tabs] of Object.entries(host_tabs).sort((a, b) => a[1].length < b[1].length)) {
        win_els.push(TabGroup(host, tabs));
    }

    return h("details", { id: "window-" + win.id, classList: ["window"], open: win.focused }, win_els);
}

function TabGroup(name, tabs) {
    if (tabs.length > 1) {
        let summary_inner_els = [];
        summary_inner_els.push(name + " (" + tabs.length + ")");
        summary_inner_els.push(h("div", { classList: ["spacer"] }));
        summary_inner_els.push(h("button", {
            onclick: event_handler(function () {
                return window.browser.tabs.discard(tabs.map((tab) => tab.id));
            })
        }, "Discard"));
        summary_inner_els.push(h("button", {
            onclick: event_handler(function () {
                return Promise.all(tabs.map((tab) => window.browser.tabs.reload(tab.id)));
            })
        }, "Reload"));
        let summary_inner = h("div", {}, summary_inner_els);
        let summary = h("summary", {}, summary_inner);

        let details_els = [summary];
        for (let tab of tabs) {
            details_els.push(Tab(tab));
        }

        return h("details", {}, details_els);
    } else {
        return Tab(tabs[0]);
    }
}

function Tab(tab) {
    let els = [];
    if (tab.favIconUrl) {
        els.push(h("img", { src: tab.favIconUrl, width: 16, height: 16 }));
    }
    els.push(tab.url);
    els.push(h("div", { classList: ["spacer"] }));
    els.push(h("button", {
        onclick: event_handler(function () {
            return window.browser.tabs.discard(tab.id);
        })
    }, "Discard"));
    els.push(h("button", {
        onclick: event_handler(function () {
            return window.browser.tabs.reload(tab.id);
        })
    }, "Reload"));
    return h("div", { id: "tab-" + tab.id, classList: ["tab"] }, els);
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
