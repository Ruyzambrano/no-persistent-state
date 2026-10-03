import {test} from "node:test";
import assert from "node:assert/strict";
import {SLIDER_MAX, sampleDelay, drawStep} from "../src/pacing.js";

test("moving the slider right shortens the delay", () => {
    for (let value = 0; value < SLIDER_MAX; value++) {
        assert.ok(sampleDelay(value + 1, false) < sampleDelay(value, false));
    };
});

test("slider range maps to 20ms to 2020ms", () => {
    assert.equal(sampleDelay(SLIDER_MAX, false), 20);
    assert.equal(sampleDelay(0, false), 2020);
});

test("default slider position matches the original 520ms pace", () => {
    assert.equal(sampleDelay(75, false), 520);
});

test("reduced motion slows sampling down", () => {
    for (const value of [0, 50, SLIDER_MAX]) {
        assert.ok(sampleDelay(value, true) > sampleDelay(value, false));
    };
});

test("reduced motion draws strokes more slowly", () => {
    assert.ok(drawStep(true) < drawStep(false));
});