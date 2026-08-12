export const auth = props => {
    const { miAxios, pjid, s, u1, u2, urs, notificacion } = props;

    const setCookie = (token, hours) => {
        const date = new Date();
        date.setTime(date.getTime() + (1000 * 60 * 60 * hours));
        const expires = 'expires=' + date.toUTCString();
        document.cookie = `${pjid}=${token};${expires};path=/`;
    };

    const clearCookie = () => {
        document.cookie = `${pjid}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    };

    const login = (usuario, passwd, onSuccess) => {
        if (s.loadings?.auth?.login) return;
        u2("loadings", "auth", "login", true);
        u1("auth", "error", null);
        const url = "auth/login";
        miAxios.post(url, { usuario, passwd })
            .then(response => {
                const { user, token } = response.data;
                u2("auth", "form", "usuario", "");
                u2("auth", "form", "passwd", "");
                u1("auth", "logged", true);
                u1("auth", "usuario", user);
                setCookie(token, 12);
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
                const { user, token } = res.data;
                setCookie(token, 5);
                u1("auth", "logged", true);
                u1("auth", "usuario", user);
                if (onDone) onDone(true);
            })
            .catch(() => {
                u1("auth", "logged", false);
                clearCookie();
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
        clearCookie();
    };

    return {
        login, validateLogin, closeSession
    };
};
