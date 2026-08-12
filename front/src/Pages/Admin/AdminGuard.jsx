import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useStates } from '../../Hooks/useStates';
import { Loader } from '../../Components/Loader';

// Protege todo lo que cuelgue de /admin: valida sesion real contra el back
// y evita que el contenido se indexe (meta robots noindex mientras esta montado).
export const AdminGuard = ({ children }) => {
    const { s, f } = useStates();
    const logged = s.auth?.logged;
    const checking = s.loadings?.auth?.validateLogin;

    useEffect(() => {
        f.auth.validateLogin();
    }, []);

    useEffect(() => {
        f.u1('sidebar', 'sideMode', 'admin');
        return () => f.u1('sidebar', 'sideMode', undefined);
    }, []);

    useEffect(() => {
        let meta = document.querySelector('meta[name="robots"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'robots';
            document.head.appendChild(meta);
        }
        const prev = meta.content;
        meta.content = 'noindex, nofollow';
        return () => { meta.content = prev || 'index, follow'; };
    }, []);

    if (logged === undefined || (checking && logged !== true)) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader label="Verificando sesión..." />
            </div>
        );
    }

    if (!logged) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};
