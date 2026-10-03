import {test} from "node:test";
import assert from "node:assert/strict";
import {lerp, quadraticBezier, segmentEndpoints} from "../src/geometry.js";

const POINTS = [
    {x: 0, y: 0},
    {x: 100, y: 0},
    {x: 100, y: 100},
    {x: 200, y: 100},
    {x: 200, y: 200}
];

test("lerp returns the endpoints at t=0 and t=1 and the midpoint at t=0.5", () => {
    const start = {x: 0, y: 10};
    const end = {x: 20, y: 30};
    assert.deepEqual(lerp(start, end, 0), start);
    assert.deepEqual(lerp(start, end, 1), end);
    assert.deepEqual(lerp(start, end, 0.5), {x: 10, y: 20});
});

test("quadraticBezier passes through start and end", () => {
    const start = {x: 0, y: 0};
    const control = {x: 50, y: 100};
    const end = {x: 100, y: 0};
    assert.deepEqual(quadraticBezier(start, control, end, 0), start);
    assert.deepEqual(quadraticBezier(start, control, end, 1), end);
    assert.deepEqual(quadraticBezier(start, control, end, 0.5), {x: 50, y: 50});
});

test("first segment starts on the first point", () => {
    assert.deepEqual(segmentEndpoints(POINTS, 0).start, POINTS[0]);
});

test("last segment ends on the last point", () => {
    const lastIndex = POINTS.length - 3;
    assert.deepEqual(segmentEndpoints(POINTS, lastIndex).end, POINTS[POINTS.length - 1]);
});

test("each segment uses the next hop as its control point", () => {
    for (let i = 0; i <= POINTS.length - 3; i++) {
        assert.deepEqual(segmentEndpoints(POINTS, i).control, POINTS[i + 1]);
    };
});

test("consecutive segments join without a gap", () => {
    for (let i = 0; i < POINTS.length - 3; i++) {
        assert.deepEqual(segmentEndpoints(POINTS, i).end, segmentEndpoints(POINTS, i + 1).start);
    };
});

test("a three-point path is a single segment from first to last point", () => {
    const threePoints = POINTS.slice(0, 3);
    assert.deepEqual(segmentEndpoints(threePoints, 0), {
        start: threePoints[0],
        control: threePoints[1],
        end: threePoints[2]
    });
});
