const MAX_BUFFER_SIZE = 500

const ws = new WebSocket("wss://ris-live.ripe.net/v1/ws/?client=js-example-1");
const params = {
    host: "rrc21",
};

let speedSample = 500;

const bufferArray = [];
const activeStrokes = [];

const canvas = document.getElementById("canvas-drawing");
const context = canvas.getContext("2d");
canvas.height = canvas.clientHeight;
canvas.width = canvas.clientWidth;


const speedElement = document.getElementById("speed-sample");

speedElement.addEventListener("input", function(event) {
    speedSample = Number(speedElement.value) * 20;
});


ws.onmessage = function(event) {
    const message = JSON.parse(event.data);
    if (message.type === "ris_message") {
        bufferArray.push(message.data)
    }
};

ws.onopen = function(event) {
    ws.send(JSON.stringify({
        type: "ris_subscribe",
        data: params
    }));
};

function hashForColour(value, modulus, salt) {
    if (salt !== 0) {
        value = value ^ salt;
    };
    const shifted = (value * 5000) << value;
    const mixed = shifted ^ (1-value);
    return ((mixed % modulus) + modulus) % modulus;

};

function tick() {
    const moment = bufferArray.pop();
    bufferArray.splice(0, bufferArray.length - MAX_BUFFER_SIZE);
    if (moment && moment.path && moment.path.length > 2) {
        const colourHslString = generateColour(hashForColour(moment.path[moment.path.length - 1], 360, 0));
        const pointPairs = generatePoints(moment.path);
        const thickness = moment.path.length;
        activeStrokes.push({points: pointPairs, colour: colourHslString, segmentIndex: 0, t: 0, thickness: thickness, currentPoint: pointPairs[0]});
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
    const lightMode = document.getElementById("light").checked;

    if (lightMode) {
        context.fillStyle = "rgba(255, 255, 255, 0.008)";
    } else {
        context.fillStyle = "rgba(0, 0, 0, 0.009)";
    };
    context.fillRect(0, 0, canvas.width, canvas.height);
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
        };
    };
    requestAnimationFrame(animateDrawing);
};

tick();
animateDrawing();