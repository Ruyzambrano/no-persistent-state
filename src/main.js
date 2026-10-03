import {createResponsiveCanvas} from "./canvas.js";
import {segmentEndpoints, quadraticBezier} from "./geometry.js";
import {hashForColour, generateColour, generatePoints} from "./hash.js";
import {SCALES, convertPitch, convertPanning, convertWaveform, convertGain, createTone} from "./sound.js";
import {createRisStream} from "./stream.js";

const MAX_BUFFER_SIZE = 500;
const MIN_PATH_LENGTH = 3;
const T_STEP = 0.05;
const FADE_STYLE = "rgba(255, 255, 255, 0.008)";

const bufferArray = [];
const activeStrokes = [];
let speedSample = 500;
let playSound = false;
let liveUpdatePitch = false;
let currentScale = SCALES.phrygian;
let audioContext;

const {context, size} = createResponsiveCanvas(document.getElementById("canvas-drawing"));

const collectorSelect = document.getElementById("collector");
const stream = createRisStream({
    collector: collectorSelect.value,
    onRoute: function(route) {
        bufferArray.push(route);
    }
});

collectorSelect.addEventListener("change", function() {
    bufferArray.length = 0;
    stream.switchCollector(collectorSelect.value);
});

const modalScale = document.getElementById("scale-mode");
modalScale.addEventListener("change", function() {
    currentScale = SCALES[modalScale.value];
});

document.body.style.backgroundColor = "black";
document.body.style.color = "rgb(211, 211, 211)";

const speedElement = document.getElementById("speed-sample");
speedElement.addEventListener("input", function() {
    speedSample = Number(speedElement.value) * 20;
});

document.getElementById("light").addEventListener("input", function() {
    document.body.style.backgroundColor = "whitesmoke";
    document.body.style.color = "rgb(77, 76, 76)";
});

document.getElementById("dark").addEventListener("input", function() {
    document.body.style.backgroundColor = "black";
    document.body.style.color = "rgb(211, 211, 211)";
});

const soundMode = document.getElementById("sound");
soundMode.addEventListener("click", function() {
    if (!audioContext) {
        audioContext = new AudioContext();
    };
    playSound = soundMode.checked;
    if (playSound) {
        audioContext.resume();
    } else {
        audioContext.suspend();
    };
});

document.getElementById("follow-pitch").addEventListener("input", function() {
    liveUpdatePitch = true;
});

document.getElementById("fixed-pitch").addEventListener("input", function() {
    liveUpdatePitch = false;
});

document.getElementById("clear-canvas").addEventListener("click", function() {
    for (const stroke of activeStrokes) {
        if (stroke.hasStarted) {
            stroke.tone.oscillator.stop();
        };
    };
    activeStrokes.length = 0;
    context.clearRect(0, 0, size.width, size.height);
});

function toneForStroke(point, hue, pathLength) {
    return createTone(audioContext, {
        frequency: convertPitch(point.y, size.height, currentScale),
        pan: convertPanning(point.x, size.width),
        waveForm: convertWaveform(hue),
        gain: convertGain(pathLength)
    });
};

function tick() {
    const route = bufferArray.pop();
    bufferArray.splice(0, bufferArray.length - MAX_BUFFER_SIZE);
    if (route && route.path && route.path.length >= MIN_PATH_LENGTH) {
        const path = route.path;
        const hue = hashForColour(path[path.length - 1], 360, 0);
        const points = generatePoints(path, size.width, size.height);
        const tone = audioContext ? toneForStroke(points[0], hue, path.length) : undefined;
        if (playSound) {
            tone.oscillator.start();
        };
        activeStrokes.push({
            points,
            colour: generateColour(hue),
            thickness: path.length,
            segmentIndex: 0,
            t: 0,
            currentPoint: points[0],
            tone,
            hasStarted: playSound
        });
    };
    setTimeout(tick, speedSample + 20);
};

function drawStroke(stroke) {
    const {start, control, end} = segmentEndpoints(stroke.points, stroke.segmentIndex);
    const nextPoint = quadraticBezier(start, control, end, stroke.t);
    context.beginPath();
    context.moveTo(stroke.currentPoint.x, stroke.currentPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.lineJoin = "round";
    context.lineCap = "round";
    context.lineWidth = stroke.thickness / 2;
    context.strokeStyle = stroke.colour;
    context.stroke();
    return nextPoint;
};

function advanceStroke(stroke) {
    const previousPoint = stroke.currentPoint;
    stroke.currentPoint = drawStroke(stroke);
    if (stroke.t >= 1) {
        stroke.segmentIndex++;
        stroke.t = 0;
    };
    stroke.t += T_STEP;
    if (stroke.tone) {
        stroke.tone.pannerNode.pan.value = convertPanning(previousPoint.x, size.width);
        if (liveUpdatePitch) {
            stroke.tone.oscillator.frequency.value = convertPitch(previousPoint.y, size.height, currentScale);
        };
    };
    return stroke.segmentIndex < stroke.points.length - 2;
};

function animateDrawing() {
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = FADE_STYLE;
    context.fillRect(0, 0, size.width, size.height);
    context.globalCompositeOperation = "source-over";
    for (let i = activeStrokes.length - 1; i >= 0; i--) {
        const stroke = activeStrokes[i];
        if (!advanceStroke(stroke)) {
            activeStrokes.splice(i, 1);
            if (stroke.hasStarted) {
                stroke.tone.oscillator.stop();
            };
        };
    };
    requestAnimationFrame(animateDrawing);
};

tick();
animateDrawing();
