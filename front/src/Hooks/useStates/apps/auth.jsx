// El token vive en una cookie httponly que pone el server (Set-Cookie en
// login/close_session): el JS del front nunca la lee ni la escribe, solo
// depende de axios mandandola sola via withCredentials.
export const auth = props => {
    const { miAxios, s, u1, u2, urs, notificacion } = props;

    const login = (usuario, passwd, onSuccess) => {
        if (s.loadings?.auth?.login) return;
        u2("loadings", "auth", "login", true);
        u1("auth", "error", null);
        const url = "auth/login";
        miAxios.post(url, { usuario, passwd })
            .then(response => {
                const { user } = response.data;
                u2("auth", "form", "usuario", "");
                u2("auth", "form", "passwd", "");
                u1("auth", "logged", true);
                u1("auth", "usuario", user);
                if (onSuccess) onSuccess(user);
            })
            .catch(error => {
                const message = error.response?.data?.detail || "No se pudo iniciar sesión";
                u1("auth", "error", message);
                u1("auth", "logged", false);
                if (notificacion) notificacion({ message, title: "Error", mode: "danger" });
            })
            .finally(() => {
                u2("loadings", "auth", "login", false);
            });
    };

    const validateLogin = (onDone) => {
        if (s.loadings?.auth?.validateLogin) return;
        u2("loadings", "auth", "validateLogin", true);
        miAxios.get("auth/validate_login")
            .then(res => {
                const { user } = res.data;
                u1("auth", "logged", true);
                u1("auth", "usuario", user);
                if (onDone) onDone(true);
            })
            .catch(() => {
                u1("auth", "logged", false);
                if (onDone) onDone(false);
            })
            .finally(() => {
                u2("loadings", "auth", "validateLogin", false);
            });
    };

    const closeSession = () => {
        if (s.auth?.logged) {
            miAxios.get("auth/close_session").catch(() => {});
        }
        urs();
    };

    return {
        login, validateLogin, closeSession
    };
};
