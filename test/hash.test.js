import {test} from "node:test";
import assert from "node:assert/strict";
import {hashForColour, generateColour, generatePoints} from "../src/hash.js";

const SAMPLE_ASNS = [1, 174, 3356, 13335, 64496, 65535, 131072, 4200000000];

test("hashForColour is deterministic", () => {
    for (const asn of SAMPLE_ASNS) {
        assert.equal(hashForColour(asn, 360, 0), hashForColour(asn, 360, 0));
    };
});

test("hashForColour stays within [0, modulus)", () => {
    for (let asn = 1; asn < 70000; asn++) {
        const hue = hashForColour(asn, 360, 0);
        assert.ok(Number.isInteger(hue) && hue >= 0 && hue < 360, `ASN ${asn} gave ${hue}`);
    };
    for (const asn of SAMPLE_ASNS) {
        const x = hashForColour(asn, 1920, 104729);
        assert.ok(x >= 0 && x < 1920, `ASN ${asn} gave ${x}`);
    };
});

test("different salts give different values for most ASNs", () => {
    const differing = SAMPLE_ASNS.filter((asn) => hashForColour(asn, 1000, 104729) !== hashForColour(asn, 1000, 15485863));
    assert.ok(differing.length >= SAMPLE_ASNS.length - 1);
});

test("generateColour builds an HSL string", () => {
    assert.equal(generateColour(200), "hsl(200, 70%, 50%)");
});

test("generatePoints gives one in-bounds point per ASN", () => {
    const points = generatePoints(SAMPLE_ASNS, 800, 600);
    assert.equal(points.length, SAMPLE_ASNS.length);
    for (const {x, y} of points) {
        assert.ok(x >= 0 && x < 800);
        assert.ok(y >= 0 && y < 600);
    };
});

test("generatePoints maps the same ASN to the same point", () => {
    const [first, second] = generatePoints([3356, 3356], 800, 600);
    assert.deepEqual(first, second);
});
