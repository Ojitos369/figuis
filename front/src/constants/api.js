// Puertos conocidos donde puede vivir el back: 8369 (uvicorn suelto en dev),
// 8372 (docker compose). Si la pagina se sirve desde alguno de estos puertos,
// el back esta en ese mismo origen. Si no (p.ej. vite en 5173 durante `pnpm dev`,
// o sin puerto visible detras de un proxy), se usa el default de dev.
// Nada de esto queda como URL fija en el bundle: se resuelve en tiempo de carga
// con window.location, asi que migrate_view.py no tiene nada de "localhost:puerto"
// que recortar (evita que la vista migrada quede apuntando a un puerto muerto).
const BACK_PORTS = ['8369', '8372'];
const DEFAULT_DEV_PORT = '8369';

const { protocol, hostname, port: currentPort } = window.location;
const port = currentPort
    ? (BACK_PORTS.includes(currentPort) ? `:${currentPort}` : `:${DEFAULT_DEV_PORT}`)
    : '';

export const LINK_API_PORT = `${protocol}//${hostname}${port}`;
export const API_URL = `${LINK_API_PORT}/api/`;
export const mediaUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${LINK_API_PORT}/media/${path}`;
};
