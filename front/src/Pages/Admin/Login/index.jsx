import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStates } from '../../../Hooks/useStates';
import { Theme } from '../../../Components/Theme';
import { cambiarThema } from '../../../Core/helper';
import style from './styles/index.module.scss';

const myStates = () => {
    const { s, f, ls } = useStates();
    const usuario = useMemo(() => s.auth?.form?.usuario ?? '', [s.auth?.form?.usuario]);
    const passwd = useMemo(() => s.auth?.form?.passwd ?? '', [s.auth?.form?.passwd]);
    const error = useMemo(() => s.auth?.error, [s.auth?.error]);
    const loading = useMemo(() => s.loadings?.auth?.login, [s.loadings?.auth?.login]);

    const updateUsuario = (e) => f.u2("auth", "form", "usuario", e.target.value);
    const updatePasswd = (e) => f.u2("auth", "form", "passwd", e.target.value);

    return { ls, usuario, passwd, error, loading, updateUsuario, updatePasswd, f };
};

export const AdminLogin = () => {
    const { ls, usuario, passwd, error, loading, updateUsuario, updatePasswd, f } = myStates();
    const navigate = useNavigate();

    useEffect(() => {
        cambiarThema(ls?.theme);
    }, [ls?.theme]);

    const login = e => {
        if (e) e.preventDefault();
        f.auth.login(usuario, passwd, () => navigate('/admin/figuras'));
    };

    return (
        <div className={`bg-my-${ls.theme}`}>
            <div className={`${style.loginPage}`}>
                <div className={`${style.card}`}>
                    <div className={`${style.brand}`}>
                        <div className={`${style.logoMark}`}>F</div>
                        <h1>Panel administrativo</h1>
                        <p>Inicia sesión para gestionar el catálogo</p>
                    </div>
                    <form className={`${style.form}`} onSubmit={login}>
                        <div className={`${style.field}`}>
                            <label htmlFor="login-usuario">Usuario</label>
                            <input
                                id="login-usuario"
                                type="text"
                                autoComplete="username"
                                placeholder="tu usuario"
                                value={usuario}
                                onChange={updateUsuario}
                            />
                        </div>
                        <div className={`${style.field}`}>
                            <label htmlFor="login-passwd">Contraseña</label>
                            <input
                                id="login-passwd"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={passwd}
                                onChange={updatePasswd}
                            />
                        </div>
                        {!!error && <div className={`${style.errorMsg}`}>{error}</div>}
                        <button type="submit" className={`${style.submit}`} disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
                <Theme />
            </div>
        </div>
    );
};
