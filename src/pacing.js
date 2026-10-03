export const SLIDER_MAX = 100;
const MS_PER_SLIDER_STEP = 20;
const MIN_DELAY = 20;
const REDUCED_MOTION_DELAY_FACTOR = 4;
const DRAW_STEP = 0.05;
const REDUCED_MOTION_DRAW_STEP = 0.025;

export function sampleDelay(sliderValue, reducedMotion) {
    const delay = (SLIDER_MAX - sliderValue) * MS_PER_SLIDER_STEP + MIN_DELAY;
    return reducedMotion ? delay * REDUCED_MOTION_DELAY_FACTOR : delay;
};

export function drawStep(reducedMotion) {
    return reducedMotion ? REDUCED_MOTION_DRAW_STEP : DRAW_STEP;
};
