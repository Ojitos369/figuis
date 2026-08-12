import { useEffect, useMemo, useRef, useState } from 'react';
import { useStates } from '../../../../Hooks/useStates';
import { Tag } from '../../../../Components/Tag';
import style from '../styles/form.module.scss';

const PRESET_COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#38bdf8', '#ec4899', '#a855f7', '#14b8a6'];
const randomColor = () => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];

// Input de etiquetas tipo badge: separadas por coma, autocompleta contra el catálogo,
// reutiliza la etiqueta existente por nombre (sin distinguir mayúsculas) o crea una nueva.
export const TagInput = ({ tags, onChange }) => {
    const { s, f } = useStates();
    const catalogo = s.catalogo?.etiquetas || [];
    const [text, setText] = useState('');
    const [creating, setCreating] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => { f.catalogo.getEtiquetas(); }, []);

    const selectedNames = useMemo(() => new Set(tags.map(t => t.nombre.toLowerCase())), [tags]);

    const suggestions = useMemo(() => {
        const q = text.trim().toLowerCase();
        if (!q) return [];
        return catalogo
            .filter(et => !selectedNames.has(et.nombre.toLowerCase()) && et.nombre.toLowerCase().includes(q))
            .slice(0, 6);
    }, [text, catalogo, selectedNames]);

    const addTag = (etiqueta) => {
        onChange([...tags, etiqueta]);
    };

    const commitName = (rawName) => {
        const nombre = rawName.trim().toLowerCase();
        if (!nombre || selectedNames.has(nombre)) return;

        const existente = catalogo.find(et => et.nombre.toLowerCase() === nombre);
        if (existente) {
            addTag(existente);
            return;
        }

        setCreating(true);
        f.admin.saveEtiqueta({ nombre, color: randomColor() }, (res) => {
            setCreating(false);
            if (!res?.id) return;
            addTag({ id: res.id, nombre: res.nombre || nombre, color: res.color || randomColor() });
            f.catalogo.getEtiquetas();
        });
    };

    const commitText = (raw) => {
        raw.split(',').forEach(part => { if (part.trim()) commitName(part); });
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            if (text.trim()) {
                commitText(text);
                setText('');
            }
        } else if (e.key === 'Backspace' && !text && tags.length) {
            onChange(tags.slice(0, -1));
        }
    };

    const onBlur = () => {
        if (text.trim()) {
            commitText(text);
            setText('');
        }
    };

    const onPaste = (e) => {
        const pasted = e.clipboardData?.getData('text');
        if (pasted?.includes(',')) {
            e.preventDefault();
            commitText(pasted);
            setText('');
        }
    };

    const removeTag = (id) => {
        onChange(tags.filter(t => t.id !== id));
    };

    return (
        <div className={style.tagInputWrap}>
            <div className={style.tagInputBox} onClick={() => inputRef.current?.focus()}>
                {tags.map(t => (
                    <Tag key={t.id} nombre={t.nombre} color={t.color} removable onRemove={() => removeTag(t.id)} />
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className={style.tagInputField}
                    placeholder={tags.length ? '' : 'Escribe y presiona coma o Enter...'}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={onBlur}
                    onPaste={onPaste}
                />
            </div>

            {!!suggestions.length && (
                <div className={style.tagSuggestions}>
                    {suggestions.map(et => (
                        <button
                            key={et.id}
                            type="button"
                            className={style.tagSuggestion}
                            onMouseDown={(e) => { e.preventDefault(); commitName(et.nombre); setText(''); }}
                        >
                            <Tag nombre={et.nombre} color={et.color} size="sm" />
                        </button>
                    ))}
                </div>
            )}

            {!!catalogo.length && (
                <div className={style.tagCatalog}>
                    {catalogo.filter(et => !selectedNames.has(et.nombre.toLowerCase())).map(et => (
                        <Tag key={et.id} nombre={et.nombre} color={et.color} size="sm" onClick={() => addTag(et)} />
                    ))}
                </div>
            )}

            {creating && <span className={style.tagCreating}>Creando etiqueta...</span>}
        </div>
    );
};
