import { useEffect } from 'react';
import style from './styles/index.module.scss';

// Modal responsive: hoja inferior en móvil, dialogo centrado en escritorio.
export const SheetModal = ({ open, onClose, title, children, footer, maxWidth = '640px' }) => {
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className={style.overlay} onClick={onClose}>
            <div
                className={style.sheet}
                style={{ '--sheet-max-w': maxWidth }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className={style.grabber} />
                <div className={style.header}>
                    <h2 className={style.title}>{title}</h2>
                    <button type="button" className={style.closeBtn} onClick={onClose} aria-label="Cerrar">✕</button>
                </div>
                <div className={style.body}>{children}</div>
                {!!footer && <div className={style.footer}>{footer}</div>}
            </div>
        </div>
    );
};
