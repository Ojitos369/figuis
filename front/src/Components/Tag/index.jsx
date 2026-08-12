import { useMemo } from 'react';
import { useStates } from '../../Hooks/useStates';
import { getReadableTagColor, getContrastText } from '../../Core/color';
import style from './styles/index.module.scss';

// Chip de etiqueta con color propio. `active`/`onClick` la vuelven seleccionable (filtros, forms).
// El color se ajusta de luminosidad segun el tema activo para que el texto nunca se pierda,
// sea cual sea el color que se haya guardado (incluso negros o blancos puros).
export const Tag = ({ nombre, color = '#6366f1', active, onClick, size = 'md', removable, onRemove }) => {
    const { ls } = useStates();
    const clickable = !!onClick;

    const { readableColor, activeText } = useMemo(() => {
        const rc = getReadableTagColor(color, ls?.theme === 'black');
        return { readableColor: rc, activeText: getContrastText(rc) };
    }, [color, ls?.theme]);

    return (
        <span
            className={`${style.tag} ${style[size] || ''} ${clickable ? style.clickable : ''} ${active ? style.active : ''}`}
            style={{ '--tag-color': readableColor, '--tag-active-text': activeText }}
            onClick={onClick}
            role={clickable ? 'button' : undefined}
        >
            <span className={style.dot} />
            {nombre}
            {removable && (
                <button
                    type="button"
                    className={style.removeBtn}
                    onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                    aria-label={`Quitar ${nombre}`}
                >
                    ✕
                </button>
            )}
        </span>
    );
};
