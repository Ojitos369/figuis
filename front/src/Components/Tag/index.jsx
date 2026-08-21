import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStates } from '../../Hooks/useStates';
import { getReadableTagColor, getContrastText } from '../../Core/color';
import style from './styles/index.module.scss';

// Chip de etiqueta con color propio. `active`/`onClick` la vuelven seleccionable (filtros, forms).
// El color se ajusta de luminosidad segun el tema activo para que el texto nunca se pierda,
// sea cual sea el color que se haya guardado (incluso negros o blancos puros).
export const Tag = ({ nombre, color = '#6366f1', active, onClick, to, size = 'md', removable, onRemove, ariaLabel }) => {
    const { ls } = useStates();
    const clickable = !!onClick || !!to;
    const displayName = String(nombre || '').trim().replace(/^#+\s*/, '');

    const { readableColor, activeText } = useMemo(() => {
        const rc = getReadableTagColor(color, ls?.theme === 'black');
        return { readableColor: rc, activeText: getContrastText(rc) };
    }, [color, ls?.theme]);

    const className = `${style.tag} ${style[size] || ''} ${clickable ? style.clickable : ''} ${active ? style.active : ''}`;
    const content = (
        <>
            <span className={style.dot} />
            {!!displayName && displayName}
            {removable && !to && (
                <button
                    type="button"
                    className={style.removeBtn}
                    onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
                    aria-label={`Quitar ${nombre}`}
                >
                    ✕
                </button>
            )}
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                className={className}
                style={{ '--tag-color': readableColor, '--tag-active-text': activeText }}
                onClick={onClick}
                aria-label={ariaLabel}
            >
                {content}
            </Link>
        );
    }

    if (onClick && !removable) {
        return (
            <button
                type="button"
                className={className}
                style={{ '--tag-color': readableColor, '--tag-active-text': activeText }}
                onClick={onClick}
                aria-label={ariaLabel}
            >
                {content}
            </button>
        );
    }

    return (
        <span
            className={className}
            style={{ '--tag-color': readableColor, '--tag-active-text': activeText }}
            onClick={onClick}
        >
            {content}
        </span>
    );
};
