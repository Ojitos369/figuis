import { useEffect, useState } from 'react';
import { normalizeHex, hexToRgb, rgbToHex } from '../../Core/color';
import style from './styles/index.module.scss';

// Picker nativo + campo de texto que alterna entre HEX (por defecto) y RGB.
export const ColorField = ({ value, onChange }) => {
    const [mode, setMode] = useState('hex');
    const [hexText, setHexText] = useState(value || '#6366f1');
    const [rgbText, setRgbText] = useState(hexToRgb(value || '#6366f1'));

    useEffect(() => {
        const norm = normalizeHex(value);
        if (!norm) return;
        setHexText(norm);
        setRgbText(hexToRgb(norm));
    }, [value]);

    const commitHex = (raw) => {
        setHexText(raw);
        const norm = normalizeHex(raw);
        if (norm) onChange(norm);
    };

    const commitRgb = (next) => {
        setRgbText(next);
        onChange(rgbToHex(next));
    };

    return (
        <div className={style.colorField}>
            <input
                type="color"
                className={style.swatch}
                value={normalizeHex(value) || '#6366f1'}
                onChange={e => onChange(e.target.value)}
                aria-label="Color"
            />

            <div className={style.modeToggle}>
                <button type="button" className={`${style.modeBtn} ${mode === 'hex' ? style.modeActive : ''}`} onClick={() => setMode('hex')}>Hex</button>
                <button type="button" className={`${style.modeBtn} ${mode === 'rgb' ? style.modeActive : ''}`} onClick={() => setMode('rgb')}>RGB</button>
            </div>

            {mode === 'hex' ? (
                <input
                    type="text"
                    className={style.hexInput}
                    value={hexText}
                    placeholder="#6366f1"
                    maxLength={7}
                    onChange={e => commitHex(e.target.value)}
                    onBlur={() => { if (!normalizeHex(hexText)) setHexText(normalizeHex(value) || '#6366f1'); }}
                />
            ) : (
                <div className={style.rgbInputs}>
                    {['r', 'g', 'b'].map(ch => (
                        <input
                            key={ch}
                            type="number"
                            min={0}
                            max={255}
                            className={style.rgbInput}
                            value={rgbText[ch]}
                            onChange={e => commitRgb({ ...rgbText, [ch]: Number(e.target.value) })}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
