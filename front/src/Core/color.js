const HEX_RE = /^#?([0-9a-f]{6})$/i;

export const normalizeHex = (hex) => {
    const m = HEX_RE.exec((hex || '').trim());
    return m ? `#${m[1].toLowerCase()}` : null;
};

export const hexToRgb = (hex) => {
    const norm = normalizeHex(hex) || '#000000';
    const n = parseInt(norm.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const clamp255 = (v) => Math.round(Math.max(0, Math.min(255, Number.isFinite(v) ? v : 0)));

export const rgbToHex = ({ r, g, b }) => {
    const toHex = (v) => clamp255(v).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const hexToHsl = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    const d = max - min;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case rn: h = ((gn - bn) / d) % 6; break;
            case gn: h = (bn - rn) / d + 2; break;
            default: h = (rn - gn) / d + 4;
        }
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: s * 100, l: l * 100 };
};

export const hslToHex = ({ h, s, l }) => {
    const sn = s / 100, ln = l / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = ln - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    return rgbToHex({
        r: (rgb[0] + m) * 255,
        g: (rgb[1] + m) * 255,
        b: (rgb[2] + m) * 255,
    });
};

// Negro o blanco: el que mejor contraste de contra un fondo solido de ese color.
export const getContrastText = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 150 ? '#141414' : '#ffffff';
};

// Ajusta solo la luminosidad (conserva matiz/saturacion) para que el color siga
// siendo legible como texto/borde de un chip, sea cual sea el tema activo.
export const getReadableTagColor = (hex, isDarkTheme) => {
    const norm = normalizeHex(hex) || '#6366f1';
    const { h, s, l } = hexToHsl(norm);
    const sat = Math.max(s, 35);
    let lig = l;
    if (isDarkTheme) {
        lig = Math.max(l, 46); // los colores muy oscuros se aclaran sobre fondos oscuros
    } else {
        lig = Math.min(l, 52); // los colores muy claros se oscurecen sobre fondos claros
    }
    return hslToHex({ h, s: sat, l: lig });
};
