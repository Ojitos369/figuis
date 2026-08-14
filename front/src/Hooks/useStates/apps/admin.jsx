export const admin = props => {
    const { miAxios, s, u1, u2, notificacion } = props;

    const notifyError = (error, fallback) => {
        const message = error.response?.data?.detail || fallback;
        if (notificacion) notificacion({ message, title: "Error", mode: "danger" });
    };

    const getFiguras = (params = {}) => {
        u2("loadings", "admin", "figuras", true);
        miAxios.get("admin/figuras", { params })
            .then(res => {
                u1("admin", "figuras", res.data.data || []);
                u1("admin", "pagination", res.data.pagination || null);
            })
            .catch(err => notifyError(err, "No se pudieron cargar las figuras"))
            .finally(() => u2("loadings", "admin", "figuras", false));
    };

    const getFigura = (id, onDone) => {
        u2("loadings", "admin", "figura", true);
        miAxios.get("admin/figura", { params: { id } })
            .then(res => {
                u1("admin", "figuraActual", res.data.data);
                if (onDone) onDone(res.data.data);
            })
            .catch(err => {
                notifyError(err, "No se pudo cargar la figura");
                if (onDone) onDone(null);
            })
            .finally(() => u2("loadings", "admin", "figura", false));
    };

    const saveFigura = (data, onDone) => {
        u2("loadings", "admin", "saveFigura", true);
        const payload = { ...data };
        if (Array.isArray(payload.etiquetas_ids)) {
            payload.etiquetas_ids = JSON.stringify(payload.etiquetas_ids);
        }
        miAxios.post("admin/save_figura", payload)
            .then(res => {
                if (notificacion) notificacion({ message: "Figura guardada", title: "Listo", mode: "success" });
                if (onDone) onDone(res.data);
            })
            .catch(err => notifyError(err, "No se pudo guardar la figura"))
            .finally(() => u2("loadings", "admin", "saveFigura", false));
    };

    const deleteFigura = (id, onDone) => {
        miAxios.delete("admin/delete_figura", { params: { id } })
            .then(res => {
                if (notificacion) notificacion({ message: "Figura eliminada", title: "Listo", mode: "success" });
                if (onDone) onDone(res.data);
            })
            .catch(err => notifyError(err, "No se pudo eliminar la figura"));
    };

    const saveFiguraArchivo = ({ figura_id, tipo, file }, onDone, onProgress) => {
        const form = new FormData();
        form.append("figura_id", figura_id);
        form.append("tipo", tipo);
        form.append("file", file);
        miAxios.post("admin/save_figura_archivo", form, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (evt) => {
                if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
            },
        })
            .then(res => { if (onDone) onDone(res.data); })
            .catch(err => {
                notifyError(err, "No se pudo subir el archivo");
                if (onDone) onDone(null);
            });
    };

    const deleteFiguraArchivo = (id, onDone) => {
        miAxios.delete("admin/delete_figura_archivo", { params: { id } })
            .then(res => { if (onDone) onDone(res.data); })
            .catch(err => notifyError(err, "No se pudo eliminar el archivo"));
    };

    // Silenciosas en éxito: se usan tanto en el picker de tags (creación automática mientras
    // se escribe) como en el catálogo de etiquetas, y el cambio ya es visible en la lista/chips.
    const saveEtiqueta = (data, onDone) => {
        miAxios.post("admin/save_etiqueta", data)
            .then(res => { if (onDone) onDone(res.data); })
            .catch(err => notifyError(err, "No se pudo guardar la etiqueta"));
    };

    const deleteEtiqueta = (id, onDone) => {
        miAxios.delete("admin/delete_etiqueta", { params: { id } })
            .then(res => { if (onDone) onDone(res.data); })
            .catch(err => notifyError(err, "No se pudo eliminar la etiqueta"));
    };

    const getSesiones = () => {
        u2("loadings", "admin", "sesiones", true);
        miAxios.get("auth/sesiones")
            .then(res => u1("admin", "sesiones", res.data.data || []))
            .catch(err => notifyError(err, "No se pudieron cargar las sesiones"))
            .finally(() => u2("loadings", "admin", "sesiones", false));
    };

    const closeSesion = (id, onDone) => {
        miAxios.delete("auth/sesiones", { params: { id } })
            .then(res => { if (onDone) onDone(res.data); })
            .catch(err => notifyError(err, "No se pudo cerrar la sesión"));
    };

    return {
        getFiguras, getFigura, saveFigura, deleteFigura,
        saveFiguraArchivo, deleteFiguraArchivo,
        saveEtiqueta, deleteEtiqueta,
        getSesiones, closeSesion,
    };
};
