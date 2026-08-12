import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStates, createState } from '../../../Hooks/useStates';
import style from './styles/index.module.scss';

const IconBox = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
    </svg>
);
const IconTag = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.6 12.6 12 21.2 2.8 12 11.4 3.4 20.6 3.4Z" /><circle cx="7.5" cy="7.5" r="1.2" />
    </svg>
);
const IconExit = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
    </svg>
);
const IconEye = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
);

export const SideBarAdmin = () => {
    const { s, f } = useStates();
    const location = useLocation();
    const navigate = useNavigate();
    const [, setSidebarOpen] = createState(['sidebar', 'open'], false);
    const [isInMd] = createState(['app', 'general', 'isInMd'], window.innerWidth >= 768);
    const nombre = useMemo(() => s.auth?.usuario?.nombre || s.auth?.usuario?.usuario || '', [s.auth?.usuario]);

    const closeIfMobile = () => { if (!isInMd) setSidebarOpen(false); };

    const elementos = [
        { name: 'Figuras', to: '/admin/figuras', icon: IconBox, match: 'figuras' },
        { name: 'Etiquetas', to: '/admin/etiquetas', icon: IconTag, match: 'etiquetas' },
    ];

    const logout = () => {
        f.auth.closeSession();
        navigate('/admin/login');
    };

    return (
        <div className={`${style.sideBarAdmin}`}>
            <div className={`${style.brand}`}>
                <span className={`${style.brandDot}`} />
                <span className={`${style.brandName}`}>Admin</span>
            </div>

            {!!nombre && <div className={`${style.userInfo}`}>Sesión: <b>{nombre}</b></div>}

            <span className={`${style.sectionLabel}`}>Catálogo</span>
            <ul className={`${style.elementsList}`}>
                {elementos.map((ele, i) => {
                    const selected = location.pathname.includes(ele.match);
                    return (
                        <li key={i}>
                            <Link to={ele.to} onClick={closeIfMobile} className={`${style.link} ${selected ? style.linkSelected : ''}`}>
                                <span className={`${style.icon}`}>{ele.icon}</span>
                                <span className={`${style.label}`}>{ele.name}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <span className={`${style.sectionLabel}`}>Sitio</span>
            <ul className={`${style.elementsList}`}>
                <li>
                    <Link to="/" onClick={closeIfMobile} className={`${style.link}`}>
                        <span className={`${style.icon}`}>{IconEye}</span>
                        <span className={`${style.label}`}>Ver catálogo público</span>
                    </Link>
                </li>
            </ul>

            <button type="button" className={`${style.logoutBtn}`} onClick={logout}>
                <span className={`${style.icon}`}>{IconExit}</span>
                <span className={`${style.label}`}>Cerrar sesión</span>
            </button>
        </div>
    );
};
