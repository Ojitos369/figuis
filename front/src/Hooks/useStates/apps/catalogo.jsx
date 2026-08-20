import { getVisitorId } from '../../../Core/visitor';

let figuraRequestSequence = 0;
let figurasRequestSequence = 0;
let tagRequestSequence = 0;

export const catalogo = props => {
    const { miAxios, u1, u2, notificacion } = props;

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
        u1("catalogo", "figuraActual", null);
        miAxios.get("catalogo/figura", { params: { id, visitor_id: getVisitorId() } })
            .then(res => {
                if (requestSequence !== figuraRequestSequence) return;
                u1("catalogo", "figuraActual", res.data.data);
                if (onDone) onDone(res.data.data);
            })
            .catch(() => {
                if (requestSequence !== figuraRequestSequence) return;
                u1("catalogo", "figuraActual", false);
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
        u1("catalogo", "tagActual", null);
        miAxios.get(`public/v1/tags/${encodeURIComponent(identifier)}`)
            .then(res => {
                if (requestSequence !== tagRequestSequence) return;
                const data = res.data?.data ?? res.data;
                u1("catalogo", "tagActual", data || false);
                if (onDone) onDone(data || null);
            })
            .catch(() => {
                if (requestSequence !== tagRequestSequence) return;
                u1("catalogo", "tagActual", false);
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
