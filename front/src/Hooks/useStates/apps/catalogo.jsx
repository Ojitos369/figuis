import { getVisitorId } from '../../../Core/visitor';
import { isFiguraIdentifierFor } from '../../../Pages/Galeria/figuraUrl';
import { isTagIdentifierFor } from '../../../Pages/Galeria/tagUrl';

let figuraRequestSequence = 0;
let figurasRequestSequence = 0;
let tagRequestSequence = 0;

export const catalogo = props => {
    const { miAxios, u1, u2, notificacion, s } = props;

    const getFiguras = (params = {}) => {
        const requestSequence = ++figurasRequestSequence;
        u2("loadings", "catalogo", "figuras", true);
        miAxios.get("catalogo/figuras", { params })
            .then(res => {
                if (requestSequence !== figurasRequestSequence) return;
                u1("catalogo", "figuras", res.data.data || []);
                u1("catalogo", "pagination", res.data.pagination || null);
            })
            .catch(() => {
                if (requestSequence === figurasRequestSequence && notificacion) {
                    notificacion({ message: "No se pudieron cargar las figuras", title: "Error", mode: "danger" });
                }
            })
            .finally(() => {
                if (requestSequence === figurasRequestSequence) {
                    u2("loadings", "catalogo", "figuras", false);
                }
            });
    };

    const resetFiguras = () => {
        // Al cambiar entre el catálogo general y una landing de etiqueta no se
        // deben mostrar resultados de la ruta anterior mientras se resuelve la
        // nueva. El contador también invalida cualquier respuesta en vuelo.
        figurasRequestSequence += 1;
        u1("catalogo", "figuras", []);
        u1("catalogo", "pagination", null);
        u2("loadings", "catalogo", "figuras", false);
    };

    const getFiguraPagina = (id, params = {}, onDone) => {
        miAxios.get("catalogo/figuras/pagina", { params: { ...params, id } })
            .then(res => {
                if (onDone) onDone(res.data.data);
            })
            .catch(() => {
                if (onDone) onDone(null);
            });
    };

    const getFigura = (id, onDone) => {
        const requestSequence = ++figuraRequestSequence;
        u2("loadings", "catalogo", "figura", true);
        // Si el estado ya trae esta misma figura (hidratada desde el SSR o de
        // una visita previa), no la vaciamos: se revalida en segundo plano
        // sin el parpadeo de "cargando" que un crawler podría capturar como
        // contenido vacío. Si es otra figura distinta, sí se limpia primero
        // para no mostrar la anterior mientras carga la nueva.
        const alreadyLoaded = isFiguraIdentifierFor(id, s?.catalogo?.figuraActual);
        if (!alreadyLoaded) u1("catalogo", "figuraActual", null);
        miAxios.get("catalogo/figura", { params: { id, visitor_id: getVisitorId() } })
            .then(res => {
                if (requestSequence !== figuraRequestSequence) return;
                u1("catalogo", "figuraActual", res.data.data);
                if (onDone) onDone(res.data.data);
            })
            .catch(err => {
                if (requestSequence !== figuraRequestSequence) return;
                // Solo un 404 confirmado significa "no existe": marcarlo así en
                // cualquier otro error (red, 5xx, timeout) forzaría noindex en
                // una figura pública real durante el render de un crawler.
                if (err?.response?.status === 404) {
                    u1("catalogo", "figuraActual", false);
                } else if (!alreadyLoaded) {
                    u1("catalogo", "figuraActual", null);
                }
                if (onDone) onDone(null);
            })
            .finally(() => {
                if (requestSequence === figuraRequestSequence) {
                    u2("loadings", "catalogo", "figura", false);
                }
            });
    };

    const getEtiquetas = () => {
        miAxios.get("catalogo/etiquetas")
            .then(res => {
                u1("catalogo", "etiquetas", res.data.data || []);
            })
            .catch(() => {});
    };

    const getTag = (identifier, onDone) => {
        const requestSequence = ++tagRequestSequence;
        u2("loadings", "catalogo", "tag", true);
        // Igual que en getFigura: no vaciar una etiqueta ya cargada (hidratada
        // o de una visita previa) mientras se revalida en segundo plano.
        const alreadyLoaded = isTagIdentifierFor(identifier, s?.catalogo?.tagActual);
        if (!alreadyLoaded) u1("catalogo", "tagActual", null);
        miAxios.get(`public/v1/tags/${encodeURIComponent(identifier)}`)
            .then(res => {
                if (requestSequence !== tagRequestSequence) return;
                const data = res.data?.data ?? res.data;
                u1("catalogo", "tagActual", data || false);
                if (onDone) onDone(data || null);
            })
            .catch(err => {
                if (requestSequence !== tagRequestSequence) return;
                // Igual que en getFigura: solo un 404 confirmado es "no existe".
                if (err?.response?.status === 404) {
                    u1("catalogo", "tagActual", false);
                } else if (!alreadyLoaded) {
                    u1("catalogo", "tagActual", null);
                }
                if (onDone) onDone(null);
            })
            .finally(() => {
                if (requestSequence === tagRequestSequence) {
                    u2("loadings", "catalogo", "tag", false);
                }
            });
    };

    const getReacciones = () => {
        miAxios.get("catalogo/reacciones_disponibles")
            .then(res => {
                u1("catalogo", "reaccionesDisponibles", res.data.data || []);
            })
            .catch(() => {});
    };

    const toggleReaccion = (figuraId, emoji, onDone) => {
        miAxios.post("catalogo/toggle_reaccion", { figura_id: figuraId, emoji, visitor_id: getVisitorId() })
            .then(res => { if (onDone) onDone(res.data); })
            .catch(() => {
                if (notificacion) notificacion({ message: "No se pudo guardar la reacción", title: "Error", mode: "danger" });
            });
    };

    return {
        getFiguras,
        resetFiguras,
        getFiguraPagina,
        getFigura,
        getEtiquetas,
        getTag,
        getReacciones,
        toggleReaccion,
    };
};
