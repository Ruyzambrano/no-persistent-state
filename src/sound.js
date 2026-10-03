export const SCALES = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10]
};

const REFERENCE_FREQUENCY = 440;
const SEMITONE_RANGE = 24;
const MIN_GAIN = 0.02;
const MAX_GAIN = 0.15;
const FULL_GAIN_PATH_LENGTH = 20;

export function convertPitch(y, height, scale) {
    const fraction = 1 - (y / height);
    const rawStep = -SEMITONE_RANGE + 2 * SEMITONE_RANGE * fraction;
    const octave = Math.floor(rawStep / 12);
    const remainder = ((rawStep % 12) + 12) % 12;
    let closestStep;
    let smallestDifference = Infinity;
    for (const step of scale) {
        const difference = Math.abs(remainder - step);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestStep = step;
        };
    };
    const snappedStep = octave * 12 + closestStep;
    return REFERENCE_FREQUENCY * (2 ** (snappedStep / 12));
};

export function convertPanning(x, width) {
    return -1 + 2 * (x / width);
};

export function convertWaveform(hue) {
    if (hue <= 126) {
        return "sine";
    } else if (hue <= 234) {
        return "triangle";
    } else if (hue <= 306) {
        return "square";
    };
    return "sawtooth";
};

export function convertGain(pathLength) {
    const fraction = Math.min(pathLength / FULL_GAIN_PATH_LENGTH, 1);
    return MIN_GAIN + (MAX_GAIN - MIN_GAIN) * fraction;
};

export function createTone(audioContext, {frequency, pan, waveForm, gain}) {
    const oscillator = audioContext.createOscillator();
    oscillator.type = waveForm;
    oscillator.frequency.value = frequency;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = gain;

    const pannerNode = audioContext.createStereoPanner();
    pannerNode.pan.value = pan;

    oscillator.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(audioContext.destination);
    return {oscillator, gainNode, pannerNode};
};
