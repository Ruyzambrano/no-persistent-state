const MAX_BUFFER_SIZE = 500

const RIS_LIVE_URL = "wss://ris-live.ripe.net/v1/ws/?client=js-example-1";
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const params = {
    host: "rrc21",
};
let reconnectDelay = INITIAL_RECONNECT_DELAY;

let speedSample = 500;

const bufferArray = [];
const activeStrokes = [];
let playSound = false;
let audioContext;
const scaleSteps = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10]
};
let currentScale = scaleSteps.phrygian
let liveUpdatePitch = false;
const modalScale = document.getElementById("scale-mode")
modalScale.addEventListener("change", function(){
    currentScale = scaleSteps[modalScale.value]
})

const canvas = document.getElementById("canvas-drawing");
const context = canvas.getContext("2d");
canvas.height = canvas.clientHeight;
canvas.width = canvas.clientWidth;

document.body.style.backgroundColor = "black";
document.body.style.color = "rgb(211, 211, 211)";
const speedElement = document.getElementById("speed-sample");

speedElement.addEventListener("input", function() {
    speedSample = Number(speedElement.value) * 20;
});

const lightMode = document.getElementById("light");
lightMode.addEventListener("input", function() {
        document.body.style.backgroundColor = "whitesmoke";
        document.body.style.color = "rgb(77, 76, 76)";
});

const darkMode = document.getElementById("dark");
darkMode.addEventListener("input", function() {
    document.body.style.backgroundColor = "black";
    document.body.style.color = "rgb(211, 211, 211)";
});

const soundMode = document.getElementById("sound");
soundMode.addEventListener("click", function() {
    if (!audioContext) {
        audioContext = new AudioContext;
    };
    if (soundMode.checked) {
        playSound = true;
        audioContext.resume();
    } else {
        playSound = false;
        audioContext.suspend();
    };
});

const followPitch = document.getElementById("follow-pitch");
followPitch.addEventListener("input", function(){
    liveUpdatePitch = true
})
const fixedPitch = document.getElementById("fixed-pitch");
fixedPitch.addEventListener("input", function(){
    liveUpdatePitch = false
})

function connect() {
    const ws = new WebSocket(RIS_LIVE_URL);

    ws.onopen = function() {
        reconnectDelay = INITIAL_RECONNECT_DELAY;
        ws.send(JSON.stringify({
            type: "ris_subscribe",
            data: params
        }));
    };

    ws.onmessage = function(event) {
        const message = JSON.parse(event.data);
        if (message.type === "ris_message") {
            bufferArray.push(message.data)
        }
    };

    ws.onerror = function(event) {
        console.error("RIS Live websocket error", event);
    };

    ws.onclose = function(event) {
        console.warn(`RIS Live connection closed (code ${event.code}), retrying in ${reconnectDelay / 1000}s`);
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    };
};

function hashForColour(value, modulus, salt) {
    if (salt !== 0) {
        value = value ^ salt;
    };
    const shifted = (value * 5000) << value;
    const mixed = shifted ^ (1-value);
    return ((mixed % modulus) + modulus) % modulus;

};

function convertPitch(y) {
    const fraction = 1- (y / canvas.height);
    const rawStep = -24 + (24 - (-24)) * fraction;
    const octave = Math.floor(rawStep / 12);
    const remainder = ((rawStep % 12) + 12) % 12;
    let closestStep;
    let smallestDifference = 10;
    for (const step of currentScale) {
        const difference = Math.abs(remainder - step);
        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestStep = step;
        }
    };
    const snappedStep = octave * 12 + closestStep;
    return 440 * (2 ** (snappedStep / 12));
};

function convertPanning(x) {
    const fraction = x / canvas.width;
    return -1 + (1 - (-1)) * fraction;
};

function convertWaveform(colour) {
    if (colour <= 126) {
        return "sine";
    } else if (colour <= 234) {
        return "triangle";
    } else if (colour <= 306) {
        return "square";
    } else {
        return "sawtooth";
    }
};

function convertGain(thickness) {
    const fraction = Math.min(thickness / 20, 1);
    return 0.02 + (0.15 - 0.02) * fraction;
};

function convertPointToTone(point, colour, thickness) {
    const pitch = convertPitch(point.y);
    const pan = convertPanning(point.x);
    const waveForm = convertWaveform(colour);
    const gain = convertGain(thickness);
    return {pitch, pan, waveForm, gain}
    
};

function generateTone(toneValues) {
    const frequency = toneValues.pitch;
    const waveForm = toneValues.waveForm;
    const gainValue = toneValues.gain;
    const panValue = toneValues.pan
    const oscillator = audioContext.createOscillator();
    oscillator.type = waveForm;
    oscillator.frequency.value = frequency;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = gainValue;

    const pannerNode = audioContext.createStereoPanner();
    pannerNode.pan.value = panValue;

    oscillator.connect(gainNode);
    gainNode.connect(pannerNode);
    pannerNode.connect(audioContext.destination);
    return {oscillator, gainNode, pannerNode}
};


function tick() {
    const moment = bufferArray.pop();
    bufferArray.splice(0, bufferArray.length - MAX_BUFFER_SIZE);
    if (moment && moment.path && moment.path.length > 2) {
        const colourHash = hashForColour(moment.path[moment.path.length - 1], 360, 0);
        const colourHslString = generateColour(colourHash);
        const pointPairs = generatePoints(moment.path);
        const thickness = moment.path.length;
        let tone;
        if (audioContext){
            const soundValues = convertPointToTone(pointPairs[0], colourHash, thickness);
            tone = generateTone(soundValues);
        };
        if (playSound) {
            tone.oscillator.start()
        }
        activeStrokes.push({points: pointPairs, colour: colourHslString, segmentIndex: 0, t: 0, thickness: thickness, currentPoint: pointPairs[0], colourHash: colourHash, tone: tone, hasStarted: playSound});
    };
    setTimeout(tick, speedSample+20);
};

function generateColour(value) {
    return `hsl(${value}, 70%, 50%)`;
};

function generatePoints(pathArray) {
    const points = [];
    for (const point of pathArray) {
            points.push({x: hashForColour(point, canvas.width, 104729), y: hashForColour(point, canvas.height, 15485863)});
        };
    return points;
};

function quadraticLerpCalculation(start, control, end, t) {
    const x = (((1-t)**2) * start.x) + (2*(1-t)*t * control.x) + ((t**2) *end.x);
    const y = (((1-t)**2) * start.y) + (2*(1-t)*t * control.y) + ((t**2) * end.y);
    return {x, y};
};

function lerpCalculation(start, end, t) {
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    return {x, y};
};

function animateDrawing() {
    context.globalCompositeOperation = "destination-out";
    context.fillStyle = "rgba(255, 255, 255, 0.008)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
    for (let i = activeStrokes.length-1; i >= 0; i--) {
        const pointDict = activeStrokes[i]
        const points = pointDict.points;
        const colour = pointDict.colour;
        const thickness = pointDict.thickness/2;
        const segmentIndex = pointDict.segmentIndex;
        const currentPoint = pointDict.currentPoint;
        const t = pointDict.t
        const control = points[segmentIndex+1];
        let start;
        if (segmentIndex === 0) {
            start = points[0];
        } else {
            start = lerpCalculation(points[segmentIndex],control, 0.5);
        };
        let end;
        if (segmentIndex === points.length-3) {
            end = points[points.length - 1];
        } else {
            end = lerpCalculation(control, points[segmentIndex+2], 0.5);
        };

        const nextPoint = quadraticLerpCalculation(start, control, end, t);
        context.beginPath(); 
        context.moveTo(currentPoint.x, currentPoint.y);
        context.lineTo(nextPoint.x, nextPoint.y);
        context.lineJoin = "round" ;
        context.lineCap = "round";
        context.lineWidth = thickness;
        context.strokeStyle = colour;
        context.stroke();
        pointDict.currentPoint = nextPoint;
        if (t >= 1) {
            pointDict.segmentIndex ++
            pointDict.t = 0
        };
        pointDict.t = pointDict.t + 0.05
        if (pointDict.segmentIndex === points.length - 2) {
            activeStrokes.splice(i, 1);
            if (pointDict.hasStarted) {
                pointDict.tone.oscillator.stop()
            }
        };
        if (pointDict.tone) {
            pointDict.tone.pannerNode.pan.value = convertPanning(currentPoint.x);
            if (liveUpdatePitch) {
                pointDict.tone.oscillator.frequency.value = convertPitch(currentPoint.y);
            };
        };
    };
    requestAnimationFrame(animateDrawing);
};

connect();
tick();
animateDrawing();