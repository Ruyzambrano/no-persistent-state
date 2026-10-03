import {test} from "node:test";
import assert from "node:assert/strict";
import {SCALES, convertPitch, convertPanning, convertWaveform, convertGain} from "../src/sound.js";

const HEIGHT = 1000;

function semitonesFromA440(frequency) {
    return Math.round(12 * Math.log2(frequency / 440));
};

test("convertPitch spans two octaves either side of A440", () => {
    assert.equal(convertPitch(HEIGHT, HEIGHT, SCALES.phrygian), 110);
    assert.equal(convertPitch(HEIGHT / 2, HEIGHT, SCALES.phrygian), 440);
    assert.equal(convertPitch(0, HEIGHT, SCALES.phrygian), 1760);
});

test("convertPitch is higher towards the top of the canvas", () => {
    assert.ok(convertPitch(100, HEIGHT, SCALES.ionian) > convertPitch(900, HEIGHT, SCALES.ionian));
});

test("convertPitch always lands on a note in the selected scale", () => {
    for (const [name, scale] of Object.entries(SCALES)) {
        for (let y = 0; y <= HEIGHT; y += 7) {
            const step = ((semitonesFromA440(convertPitch(y, HEIGHT, scale)) % 12) + 12) % 12;
            assert.ok(scale.includes(step), `${name} at y=${y} gave step ${step}`);
        };
    };
});

function yForSemitones(semitones) {
    return HEIGHT * (1 - (semitones + 24) / 48);
};

test("convertPitch rounds up to the next octave's root when it is nearer", () => {
    assert.equal(semitonesFromA440(convertPitch(yForSemitones(11.9), HEIGHT, SCALES.phrygian)), 12);
    assert.equal(semitonesFromA440(convertPitch(yForSemitones(-0.1), HEIGHT, SCALES.phrygian)), 0);
});

test("convertPitch picks the nearest note in the scale", () => {
    for (const [name, scale] of Object.entries(SCALES)) {
        const scaleNotes = [];
        for (let octave = -3; octave <= 2; octave++) {
            for (const step of scale) {
                scaleNotes.push(octave * 12 + step);
            };
        };
        for (let raw = -24; raw <= 24; raw += 0.13) {
            const snapped = semitonesFromA440(convertPitch(yForSemitones(raw), HEIGHT, scale));
            const nearest = Math.min(...scaleNotes.map((note) => Math.abs(note - raw)));
            assert.ok(Math.abs(Math.abs(snapped - raw) - nearest) < 1e-9, `${name}: ${raw.toFixed(2)} snapped to ${snapped}`);
        };
    };
});

test("convertPanning maps left edge to -1, centre to 0 and right edge to 1", () => {
    assert.equal(convertPanning(0, 800), -1);
    assert.equal(convertPanning(400, 800), 0);
    assert.equal(convertPanning(800, 800), 1);
});

test("convertWaveform buckets hues from calm to harsh", () => {
    const cases = [
        [0, "sine"], [126, "sine"],
        [127, "triangle"], [234, "triangle"],
        [235, "square"], [306, "square"],
        [307, "sawtooth"], [359, "sawtooth"]
    ];
    for (const [hue, expected] of cases) {
        assert.equal(convertWaveform(hue), expected, `hue ${hue}`);
    };
});

test("convertGain scales with path length and is capped", () => {
    assert.equal(convertGain(0), 0.02);
    assert.ok(Math.abs(convertGain(20) - 0.15) < 1e-12);
    assert.equal(convertGain(100), convertGain(20));
    assert.ok(convertGain(5) < convertGain(10));
});
