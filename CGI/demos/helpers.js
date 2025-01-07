export { setup_keydown_handlers };

let glyphs = {
    'ArrowLeft': "←",
    'ArrowRight': "→",
    "ArrowUp": "↑",
    "ArrowDown": "↓",
    "Shift": "⇧",
    "PageUp": "⤒",
    "PageDown": "⤓",
    "Home": "⇱",
    "End": "⇲"
};


function setup_keydown_handlers(window, handlers) {

    const help_panel = document.getElementById('help_panel');

    let node = document.createElement("div");
    node.textContent = "Keys";
    help_panel.appendChild(node);

    node = document.createElement("div");
    node.textContent = "'h' - Toggle this panel";
    help_panel.appendChild(node);

    for (let k in handlers) {
        const node = document.createElement("div");
        node.textContent = "'" + (k in glyphs ? glyphs[k] : k) + "' : " + handlers[k].msg;
        help_panel.appendChild(node);
    }

    window.addEventListener("keydown", (event) => {

        // Application specific handlers
        if (event.key in handlers) {
            return handlers[event.key].handler(event);
        }

        // Help panel toggle handler
        switch (event.key) {
            case 'h':
                const panel = document.getElementById("help_panel");
                if (panel.style.display == "none")
                    panel.style.display = "block";
                else
                    panel.style.display = "none";
                break;
        }
    });
}
