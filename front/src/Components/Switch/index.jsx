import style from './styles/index.module.scss';

export const Switch = ({ checked, onChange, label, description, disabled }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={!!checked}
            disabled={disabled}
            onClick={onChange}
            className={`${style.switchRow} ${checked ? style.on : ''}`}
        >
            <span className={style.texts}>
                <span className={style.label}>{label}</span>
                {!!description &&
                <span className={style.description}>{description}</span>}
            </span>
            <span className={style.track} aria-hidden="true">
                <span className={style.thumb} />
            </span>
        </button>
    );
};
