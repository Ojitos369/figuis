let toastSeq = 0;

export const general = props => {
    const { addToast, removeToast } = props;

    // Notificacion tipo toast: no bloqueante, se autodescarta sola.
    const notificacion = (data) => {
        const id = `t${Date.now()}_${toastSeq++}`;
        addToast({
            id,
            title: data.title || '',
            message: data.message || '',
            mode: data.mode || 'info',
        });
        const duration = data.duration || 3500;
        setTimeout(() => removeToast(id), duration);
    };

    return {
        notificacion, removeToast
    };
};
