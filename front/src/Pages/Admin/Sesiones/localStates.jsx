import { useEffect, useMemo, useCallback } from 'react';
import { useStates } from '../../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();
    const sesiones = useMemo(() => s.admin?.sesiones || [], [s.admin?.sesiones]);
    const loading = useMemo(() => s.loadings?.admin?.sesiones, [s.loadings?.admin?.sesiones]);

    const reload = useCallback(() => {
        f.admin.getSesiones();
    }, [f.admin]);

    const cerrar = useCallback((sesion) => {
        if (sesion.actual) {
            if (!window.confirm('Esta es tu sesión actual: al cerrarla saldrás del panel. ¿Continuar?')) return;
        } else if (!window.confirm(`¿Cerrar la sesión de "${sesion.nombre || sesion.usuario}"?`)) {
            return;
        }
        f.admin.closeSesion(sesion.id, () => {
            if (sesion.actual) {
                f.auth.closeSession();
                window.location.href = '/admin/login';
                return;
            }
            reload();
        });
    }, [f.admin, f.auth, reload]);

    return { style, sesiones, loading, reload, cerrar };
};

export const localEffects = (ls) => {
    const { f } = useStates();
    useEffect(() => {
        f.u1('page', 'title', 'Sesiones');
        ls.reload();
    }, []);
};
