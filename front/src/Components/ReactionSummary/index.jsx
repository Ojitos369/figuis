import style from './styles/index.module.scss';

// Pastillas de solo lectura con las reacciones top de una figura (para tarjetas de grid).
export const ReactionSummary = ({ reacciones }) => {
    if (!reacciones?.length) return null;
    return (
        <div className={style.summary}>
            {reacciones.map(r => (
                <span key={r.emoji} className={style.pill}>
                    <span className={style.emoji}>{r.emoji}</span>
                    <span className={style.count}>{r.cantidad}</span>
                </span>
            ))}
        </div>
    );
};
