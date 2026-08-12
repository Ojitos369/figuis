import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useStates } from '../../Hooks/useStates';
import { REACTION_EMOJIS } from '../../Core/visitor';
import { Loader } from '../Loader';
import style from './styles/index.module.scss';

// emoji-mart + su set de datos pesan bastante: solo se descargan si el usuario
// realmente abre el catalogo completo (boton "+").
const EmojiPicker = lazy(() => import('../EmojiPicker').then(m => ({ default: m.EmojiPicker })));

// Barra de reacciones tipo whatsapp: presets rapidos + cualquier emoji ya usado
// por otros + catalogo completo (con busqueda) para agregar uno nuevo.
export const ReactionBar = ({ figuraId, reacciones, misReacciones }) => {
    const { f } = useStates();
    const [counts, setCounts] = useState({});
    const [mine, setMine] = useState(new Set());
    const [busy, setBusy] = useState(null);
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        const map = {};
        (reacciones || []).forEach(r => { map[r.emoji] = r.cantidad; });
        setCounts(map);
        setMine(new Set(misReacciones || []));
    }, [figuraId, reacciones, misReacciones]);

    const toggle = (emoji) => {
        if (busy) return;
        setPickerOpen(false);
        setBusy(emoji);
        f.catalogo.toggleReaccion(figuraId, emoji, (res) => {
            setBusy(null);
            if (!res) return;
            const map = {};
            (res.reacciones || []).forEach(r => { map[r.emoji] = r.cantidad; });
            setCounts(map);
            setMine(prev => {
                const next = new Set(prev);
                if (res.added) next.add(emoji); else next.delete(emoji);
                return next;
            });
        });
    };

    // Presets siempre visibles + cualquier otro emoji que ya tenga reacciones (custom).
    const emojisToShow = useMemo(() => {
        const extra = Object.keys(counts).filter(e => !REACTION_EMOJIS.includes(e));
        extra.sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
        return [...REACTION_EMOJIS, ...extra];
    }, [counts]);

    return (
        <div className={style.wrap}>
            <div className={style.bar}>
                {emojisToShow.map(emoji => {
                    const count = counts[emoji] || 0;
                    const active = mine.has(emoji);
                    return (
                        <button
                            key={emoji}
                            type="button"
                            className={`${style.chip} ${active ? style.active : ''}`}
                            onClick={() => toggle(emoji)}
                            disabled={busy === emoji}
                        >
                            <span className={style.emoji}>{emoji}</span>
                            {count > 0 && <span className={style.count}>{count}</span>}
                        </button>
                    );
                })}

                <button
                    type="button"
                    className={`${style.chip} ${style.addBtn}`}
                    onClick={() => setPickerOpen(true)}
                    aria-label="Agregar otro emoji"
                >
                    +
                </button>
            </div>

            {pickerOpen && (
                <div className={style.pickerOverlay}>
                    <div className={style.pickerAnchor}>
                        <Suspense fallback={<div className={style.pickerLoading}><Loader label="Cargando emojis..." /></div>}>
                            <EmojiPicker onPick={toggle} onClose={() => setPickerOpen(false)} />
                        </Suspense>
                    </div>
                </div>
            )}
        </div>
    );
};
