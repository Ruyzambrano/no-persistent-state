export function lerp(start, end, t) {
    const x = start.x + (end.x - start.x) * t;
    const y = start.y + (end.y - start.y) * t;
    return {x, y};
};

export function quadraticBezier(start, control, end, t) {
    const x = ((1 - t) ** 2) * start.x + 2 * (1 - t) * t * control.x + (t ** 2) * end.x;
    const y = ((1 - t) ** 2) * start.y + 2 * (1 - t) * t * control.y + (t ** 2) * end.y;
    return {x, y};
};

export function segmentEndpoints(points, segmentIndex) {
    const control = points[segmentIndex + 1];
    const isFirst = segmentIndex === 0;
    const isLast = segmentIndex === points.length - 3;
    const start = isFirst ? points[0] : lerp(points[segmentIndex], control, 0.5);
    const end = isLast ? points[points.length - 1] : lerp(control, points[segmentIndex + 2], 0.5);
    return {start, control, end};
};
