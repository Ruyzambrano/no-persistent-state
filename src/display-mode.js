const TOGGLE_KEY = "f";
const DISPLAY_MODE_CLASS = "display-mode";
const IGNORED_TARGETS = "select, textarea, input[type='text'], dialog";

export function setUpDisplayMode(button, canvas) {
    const body = document.body;

    function isActive() {
        return body.classList.contains(DISPLAY_MODE_CLASS);
    };

    function enter() {
        body.classList.add(DISPLAY_MODE_CLASS);
        if (document.fullscreenEnabled) {
            document.documentElement.requestFullscreen().catch(function(error) {
                console.warn("Fullscreen unavailable, hiding controls only", error);
            });
        };
    };

    function exit() {
        body.classList.remove(DISPLAY_MODE_CLASS);
        if (document.fullscreenElement) {
            document.exitFullscreen();
        };
    };

    function toggle() {
        if (isActive()) {
            exit();
        } else {
            enter();
        };
    };

    button.addEventListener("click", toggle);

    canvas.addEventListener("click", function() {
        if (isActive()) {
            exit();
        };
    });

    document.addEventListener("keydown", function(event) {
        if (event.metaKey || event.ctrlKey || event.altKey || event.target.closest(IGNORED_TARGETS)) {
            return;
        };
        if (event.key.toLowerCase() === TOGGLE_KEY) {
            toggle();
        } else if (event.key === "Escape" && isActive()) {
            exit();
        };
    });

    document.addEventListener("fullscreenchange", function() {
        if (!document.fullscreenElement) {
            body.classList.remove(DISPLAY_MODE_CLASS);
        };
    });
};
