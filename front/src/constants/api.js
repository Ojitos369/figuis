export const API_PORT = 8369;
export const LINK_API_PORT = `http://localhost:${API_PORT}`;
export const API_URL = `${LINK_API_PORT}/api/`;
export const mediaUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${LINK_API_PORT}/media/${path}`;
};
