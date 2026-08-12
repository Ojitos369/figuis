import { useEffect, useState } from 'react';
import { useStates } from '../../Hooks/useStates';
import { REACTION_EMOJIS } from '../../Core/visitor';
import style from './styles/index.module.scss';

// Barra de reacciones tipo whatsapp: set fijo de emojis, cada uno con su conteo
// real y resaltado si el visitante (anonimo, por navegador) ya reacciono con el.
export const ReactionBar = ({ figuraId, reacciones, misReacciones }) => {
    const { f } = useStates();
    const [counts, setCounts] = useState({});
    const [mine, setMine] = useState(new Set());
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        const map = {};
        (reacciones || []).forEach(r => { map[r.emoji] = r.cantidad; });
        setCounts(map);
        setMine(new Set(misReacciones || []));
    }, [figuraId, reacciones, misReacciones]);

    const toggle = (emoji) => {
        if (busy) return;
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

    return (
        <div className={style.bar}>
            {REACTION_EMOJIS.map(emoji => {
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
        </div>
    );
};
