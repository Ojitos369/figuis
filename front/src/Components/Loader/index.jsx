import style from './styles/index.module.scss';

// Loader minimalista reutilizable.
// variant: 'spinner' (default) | 'dots' | 'bar'
export const Loader = ({ variant = 'spinner', size = 22, label, center = false }) => {
    const wrap = `${style.loader} ${center ? style.center : ''}`;

    if (variant === 'dots') {
        return (
            <span className={wrap} role="status" aria-live="polite">
                <span className={style.dots}>
                    <span /><span /><span />
                </span>
                {label && <span className={style.label}>{label}</span>}
            </span>
        );
    }

    if (variant === 'bar') {
        return (
            <span className={`${wrap} ${style.barWrap}`} role="status" aria-live="polite">
                <span className={style.bar}><span /></span>
                {label && <span className={style.label}>{label}</span>}
            </span>
        );
    }

    return (
        <span className={wrap} role="status" aria-live="polite">
            <span
                className={style.spinner}
                style={{ width: `${size}px`, height: `${size}px` }}
            />
            {label && <span className={style.label}>{label}</span>}
        </span>
    );
};
