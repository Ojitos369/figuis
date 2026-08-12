import { useStates } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

const ICONS = { success: '✓', danger: '✕', warning: '!', info: 'i' };

export const ToastStack = () => {
    const { s, f } = useStates();
    const toasts = s.general?.toasts || [];

    if (!toasts.length) return null;

    return (
        <div className={style.stack}>
            {toasts.map(t => (
                <div key={t.id} className={`${style.toast} ${style[t.mode] || style.info}`}>
                    <span className={style.icon}>{ICONS[t.mode] || ICONS.info}</span>
                    <div className={style.body}>
                        {!!t.title && <div className={style.title}>{t.title}</div>}
                        {!!t.message && <div className={style.message}>{t.message}</div>}
                    </div>
                    <button
                        type="button"
                        className={style.close}
                        onClick={() => f.general.removeToast(t.id)}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};
