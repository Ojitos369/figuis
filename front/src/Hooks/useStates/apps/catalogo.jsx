export const catalogo = props => {
    const { miAxios, s, u1, u2, notificacion } = props;

    const getFiguras = (params = {}) => {
        if (s.loadings?.catalogo?.figuras) return;
        u2("loadings", "catalogo", "figuras", true);
        miAxios.get("catalogo/figuras", { params })
            .then(res => {
                u1("catalogo", "figuras", res.data.data || []);
                u1("catalogo", "pagination", res.data.pagination || null);
            })
            .catch(() => {
                if (notificacion) notificacion({ message: "No se pudieron cargar las figuras", title: "Error", mode: "danger" });
            })
            .finally(() => {
                u2("loadings", "catalogo", "figuras", false);
            });
    };

    const getFigura = (id, onDone) => {
        u2("loadings", "catalogo", "figura", true);
        u1("catalogo", "figuraActual", null);
        miAxios.get("catalogo/figura", { params: { id } })
            .then(res => {
                u1("catalogo", "figuraActual", res.data.data);
                if (onDone) onDone(res.data.data);
            })
            .catch(() => {
                u1("catalogo", "figuraActual", false);
                if (onDone) onDone(null);
            })
            .finally(() => {
                u2("loadings", "catalogo", "figura", false);
            });
    };

    const getEtiquetas = () => {
        miAxios.get("catalogo/etiquetas")
            .then(res => {
                u1("catalogo", "etiquetas", res.data.data || []);
            })
            .catch(() => {});
    };

    return { getFiguras, getFigura, getEtiquetas };
};
