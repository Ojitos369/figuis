import { useState, useEffect, useRef, useMemo } from 'react';
import { useStates } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

const myStates = () => {
    const { s, f } = useStates();
    const usuario = useMemo(() => s.auth?.form?.usuario ?? '', [s.auth?.form?.usuario]);
    const passwd = useMemo(() => s.auth?.form?.passwd ?? '', [s.auth?.form?.passwd]);

    const updateUsuario = (e) => {
        const value = e.target.value;
        f.u2("auth", "form", "usuario", value);
    }
    const updatePasswd = (e) => {
        const value = e.target.value;
        f.u2("auth", "form", "passwd", value);
    };

    const login = e => {
        if (!!e) e.preventDefault();
        f.auth.login(usuario, passwd);
    }

    return {
        usuario, passwd, updateUsuario, updatePasswd, login
    }
}

export const Login = () => {
    const { usuario, passwd, updateUsuario, updatePasswd, login } = myStates();
    return (
        <div className={`${style.loginPage}`}>
            <div className={`${style.card}`}>
                <div className={`${style.brand}`}>
                    <div className={`${style.logoMark}`}>R</div>
                    <h1>Bienvenido</h1>
                    <p>Inicia sesión para continuar</p>
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
                    <button type="submit" className={`${style.submit}`}>
                        Ingresar
                    </button>
                </form>
            </div>
        </div>
    );
};
