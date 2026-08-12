import { useEffect, useRef } from 'react';
import { Picker } from 'emoji-mart';
import data from '@emoji-mart/data';

// Catalogo completo de emojis (con busqueda) via emoji-mart, igual que en ../idea.
export const EmojiPicker = ({ onPick, onClose }) => {
    const ref = useRef(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        const picker = new Picker({
            data,
            theme: 'dark',
            set: 'native',
            locale: 'es',
            previewPosition: 'none',
            navPosition: 'top',
            maxFrequentRows: 2,
            autoFocus: true,
            onEmojiSelect: (e) => { onPick(e.native); },
        });
        ref.current?.appendChild(picker);

        // Delay para que el click que abrio el picker no lo cierre de inmediato.
        let removeHandler = null;
        const timer = setTimeout(() => {
            const handler = (e) => {
                if (ref.current && !ref.current.contains(e.target)) {
                    onCloseRef.current?.();
                }
            };
            document.addEventListener('mousedown', handler);
            removeHandler = () => document.removeEventListener('mousedown', handler);
        }, 200);

        return () => {
            clearTimeout(timer);
            removeHandler?.();
            picker.remove?.();
        };
    }, []); // eslint-disable-line

    return <div ref={ref} className="shadow-xl rounded-xl overflow-hidden" />;
};
