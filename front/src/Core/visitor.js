const KEY = 'figuis_visitor_id';

// Id anonimo por navegador (no requiere cuenta) para poder togglear reacciones
// propias sin repetirlas ni necesitar login.
export const getVisitorId = () => {
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        localStorage.setItem(KEY, id);
    }
    return id;
};

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '✨'];
