import { h, render } from "../node_modules/preact/dist/preact.mjs";

reload_window_list();
window.browser.windows.onCreated.addListener(event_handler(reload_window_list));
window.browser.windows.onRemoved.addListener(event_handler(reload_window_list));
window.browser.windows.onFocusChanged.addListener(event_handler(reload_window_list));
window.browser.tabs.onCreated.addListener(event_handler(reload_window_list));
window.browser.tabs.onRemoved.addListener(event_handler(reload_window_list));
window.browser.tabs.onUpdated.addListener(event_handler(reload_window_list));

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

    render(
        [h("h2", {}, "Windows")].concat(window_list.map(Window)),
        document.getElementById("windows")
    );
}

function Button(title, icon, handler) {
    return h(
        "a",
        {
            onclick: function (e) {
                // Prevent <details> element from toggling collapse state when clicking on a button
                e.preventDefault();
                e.stopImmediatePropagation();
                handler()
            },
            title,
        },
        h("i", { class: "fas fa-" + icon }),
    );
}

function TabActions(tabs) {
    let actions = [
        h("div", { class: "spacer" }),
        Button("Discard", "snowflake", event_handler(function () {
            return window.browser.tabs.discard(tabs.map((tab) => tab.id));
        })),
        Button("Reload", "redo", event_handler(function () {
            return Promise.all(tabs.map((tab) => window.browser.tabs.reload(tab.id)));
        })),
        Button("Move to begin", "arrow-left", event_handler(function () {
            return window.browser.tabs.move(tabs.map((tab) => tab.id), { index: 0 })
        })),
        Button("Move to end", "arrow-right", event_handler(function () {
            return window.browser.tabs.move(tabs.map((tab) => tab.id), { index: -1 })
        })),
    ];
    if (tabs.length == 1) {
        actions.push(Button("Close", "times", event_handler(function () {
            return window.browser.tabs.remove(tabs[0].id);
        })));
    }
    return actions;
}

function Window(win) {
    let win_els = [];
    let title = win.title;
    if (title.endsWith(" - Firefox Developer Edition")) {
        title = title.substr(0, title.length - " - Firefox Developer Edition".length);
    }
    win_els.push(h("summary", {}, title + (win.focused ? " (Active, " : "(") + win.tabs.length + ")"));

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

    let host_tabs_array = [];
    let rest_tabs_array = [];
    for (let [host, tabs] of Object.entries(host_tabs).sort((a, b) => a[1].length < b[1].length)) {
        if (tabs.length > 1) {
            host_tabs_array.push([host, tabs]);
        } else {
            rest_tabs_array.push(tabs[0]);
        }
    }
    win_els.push(TabGroup("<others>", rest_tabs_array));
    for (let [host, tabs] of host_tabs_array) {
        win_els.push(TabGroup(host, tabs));
    }

    return h("details", { class: "window", open: win.focused, key: "window-" + win.id.toString() }, win_els);
}

function TabGroup(name, tabs) {
    let summary = h(
        "summary",
        { key: "tab-group-" + name },
        h("div", {}, [
            name + " (" + tabs.length + ")",
            TabActions(tabs)
        ])
    );

    return h("details", {}, [summary].concat(tabs.map(Tab)));
}

function Tab(tab) {
    let els = [];
    if (tab.favIconUrl) {
        els.push(h("img", { src: tab.favIconUrl, width: 16, height: 16 }));
    }
    els.push(tab.url);
    els.push(TabActions([tab]));
    return h("div", {
        class: "tab",
        onclick: event_handler(function () {
            return window.browser.tabs.highlight({ windowId: tab.windowId, tabs: [tab.index] });
        }),
        key: "tab-" + tab.id.toString(),
    }, els);
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
