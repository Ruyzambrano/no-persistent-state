const X_SALT = 104729;
const Y_SALT = 15485863;

export function hashForColour(value, modulus, salt) {
    if (salt !== 0) {
        value = value ^ salt;
    };
    const shifted = (value * 5000) << value;
    const mixed = shifted ^ (1 - value);
    return ((mixed % modulus) + modulus) % modulus;
};

export function generateColour(hue) {
    return `hsl(${hue}, 70%, 50%)`;
};

export function generatePoints(path, width, height) {
    return path.map(function(asn) {
        return {x: hashForColour(asn, width, X_SALT), y: hashForColour(asn, height, Y_SALT)};
    });
};
