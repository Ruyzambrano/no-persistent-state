const RESIZE_SETTLE_DELAY = 250;

function takeSnapshot(canvas) {
    const snapshot = document.createElement("canvas");
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext("2d").drawImage(canvas, 0, 0);
    return snapshot;
};

export function createResponsiveCanvas(canvas) {
    const context = canvas.getContext("2d");
    const size = {width: 0, height: 0};
    let resizeSnapshot;
    let resizeSettleTimer;

    function resize() {
        if (!resizeSnapshot && canvas.width > 0 && canvas.height > 0) {
            resizeSnapshot = takeSnapshot(canvas);
        };

        const dpr = window.devicePixelRatio || 1;
        size.width = canvas.clientWidth;
        size.height = canvas.clientHeight;
        canvas.width = Math.round(size.width * dpr);
        canvas.height = Math.round(size.height * dpr);
        context.scale(dpr, dpr);

        if (resizeSnapshot) {
            context.drawImage(resizeSnapshot, 0, 0, size.width, size.height);
        };

        clearTimeout(resizeSettleTimer);
        resizeSettleTimer = setTimeout(function() {
            resizeSnapshot = undefined;
        }, RESIZE_SETTLE_DELAY);
    };

    resize();
    new ResizeObserver(resize).observe(canvas);
    return {context, size};
};
