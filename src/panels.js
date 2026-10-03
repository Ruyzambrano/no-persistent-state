const SETTINGS_OPEN_CLASS = "settings-open";

export function setUpSettingsToggle(button) {
    button.addEventListener("click", function() {
        const isOpen = document.body.classList.toggle(SETTINGS_OPEN_CLASS);
        button.setAttribute("aria-expanded", String(isOpen));
    });
};

export function setUpAboutDialog(openButton, dialog) {
    openButton.addEventListener("click", function() {
        dialog.showModal();
    });

    dialog.addEventListener("click", function(event) {
        const box = dialog.getBoundingClientRect();
        const outside = event.clientX < box.left || event.clientX > box.right
            || event.clientY < box.top || event.clientY > box.bottom;
        if (outside) {
            dialog.close();
        };
    });
};
