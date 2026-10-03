import {test} from "node:test";
import assert from "node:assert/strict";
import {collectorFromHost, nextReconnectDelay, createRisStream} from "../src/stream.js";

class FakeWebSocket {
    static OPEN = 1;
    static instances = [];

    constructor(url) {
        this.url = url;
        this.readyState = 0;
        this.sent = [];
        FakeWebSocket.instances.push(this);
    };

    send(message) {
        this.sent.push(JSON.parse(message));
    };

    open() {
        this.readyState = FakeWebSocket.OPEN;
        this.onopen();
    };

    receive(message) {
        this.onmessage({data: JSON.stringify(message)});
    };
};

function routeFrom(host) {
    return {type: "ris_message", data: {host, path: [1, 2, 3]}};
};

function setUp(collector = "rrc21") {
    FakeWebSocket.instances = [];
    const routes = [];
    const stream = createRisStream({
        collector,
        onRoute: (route) => routes.push(route),
        WebSocketImpl: FakeWebSocket
    });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    return {stream, socket, routes};
};

test("collectorFromHost strips the domain RIS Live adds", () => {
    assert.equal(collectorFromHost("rrc21.ripe.net"), "rrc21");
    assert.equal(collectorFromHost("rrc21"), "rrc21");
});

test("nextReconnectDelay doubles and caps at 30 seconds", () => {
    assert.equal(nextReconnectDelay(1000), 2000);
    assert.equal(nextReconnectDelay(16000), 30000);
    assert.equal(nextReconnectDelay(30000), 30000);
});

test("subscribes to the chosen collector when the socket opens", () => {
    const {socket} = setUp("rrc06");
    assert.deepEqual(socket.sent, [{type: "ris_subscribe", data: {host: "rrc06"}}]);
});

test("passes on routes from the current collector, using RIS Live's full hostname", () => {
    const {socket, routes} = setUp("rrc21");
    socket.receive(routeFrom("rrc21.ripe.net"));
    assert.equal(routes.length, 1);
});

test("ignores routes from other collectors", () => {
    const {socket, routes} = setUp("rrc21");
    socket.receive(routeFrom("rrc06.ripe.net"));
    assert.equal(routes.length, 0);
});

test("switching collector unsubscribes from the old one before subscribing to the new one", () => {
    const {stream, socket, routes} = setUp("rrc21");
    stream.switchCollector("rrc06");
    assert.deepEqual(socket.sent.slice(1), [
        {type: "ris_unsubscribe", data: {host: "rrc21"}},
        {type: "ris_subscribe", data: {host: "rrc06"}}
    ]);
    socket.receive(routeFrom("rrc21.ripe.net"));
    socket.receive(routeFrom("rrc06.ripe.net"));
    assert.equal(routes.length, 1);
    assert.equal(routes[0].host, "rrc06.ripe.net");
});

test("switching before the socket opens subscribes to the new collector on open", () => {
    FakeWebSocket.instances = [];
    const stream = createRisStream({collector: "rrc21", onRoute: () => {}, WebSocketImpl: FakeWebSocket});
    stream.switchCollector("rrc06");
    const socket = FakeWebSocket.instances[0];
    socket.open();
    assert.deepEqual(socket.sent, [{type: "ris_subscribe", data: {host: "rrc06"}}]);
});
