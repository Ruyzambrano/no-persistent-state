const RIS_LIVE_URL = "wss://ris-live.ripe.net/v1/ws/?client=no-persistent-state";
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function collectorFromHost(host) {
    return host.split(".")[0];
};

export function nextReconnectDelay(delay) {
    return Math.min(delay * 2, MAX_RECONNECT_DELAY);
};

export function createRisStream({collector, onRoute, WebSocketImpl = WebSocket}) {
    let currentCollector = collector;
    let reconnectDelay = INITIAL_RECONNECT_DELAY;
    let socket;

    function send(type, data) {
        if (socket && socket.readyState === WebSocketImpl.OPEN) {
            socket.send(JSON.stringify({type, data}));
        };
    };

    function connect() {
        socket = new WebSocketImpl(RIS_LIVE_URL);

        socket.onopen = function() {
            reconnectDelay = INITIAL_RECONNECT_DELAY;
            send("ris_subscribe", {host: currentCollector});
        };

        socket.onmessage = function(event) {
            const message = JSON.parse(event.data);
            if (message.type === "ris_message" && collectorFromHost(message.data.host) === currentCollector) {
                onRoute(message.data);
            } else if (message.type === "ris_error") {
                console.error("RIS Live error:", message.data.message);
            };
        };

        socket.onerror = function(event) {
            console.error("RIS Live websocket error", event);
        };

        socket.onclose = function(event) {
            console.warn(`RIS Live connection closed (code ${event.code}), retrying in ${reconnectDelay / 1000}s`);
            setTimeout(connect, reconnectDelay);
            reconnectDelay = nextReconnectDelay(reconnectDelay);
        };
    };

    function switchCollector(nextCollector) {
        send("ris_unsubscribe", {host: currentCollector});
        currentCollector = nextCollector;
        send("ris_subscribe", {host: currentCollector});
    };

    connect();
    return {switchCollector};
};
