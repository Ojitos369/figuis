import { useMemo } from "react";
import { useStates, createState } from "../../../Hooks/useStates";
import style from './styles/index.module.scss';

// Iconos minimalistas (stroke) reutilizables como elementos del menú
const IconHome = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
);

const IconMcp = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
        <path d="M8.5 11 15.5 7M8.5 13l7 4" />
    </svg>
);

const IconCustom = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <circle cx="12" cy="12" r="4.5" />
    </svg>
);

export const localStates = () => {
    const { s } = useStates();
    const [, setSidebarOpen] = createState(['sidebar', 'open'], false);
    const [isInMd] = createState(['app', 'general', 'isInMd'], window.innerWidth >= 768);
    const actualPage = useMemo(() => s.page?.actual || '', [s.page?.actual]);

    // Contenido dinámico del sidebar (mapeado en el render)
    const elementos = useMemo(() => ([
        { name: 'Catálogo', page_name: 'index', to: '/', icon: IconHome },
        { name: 'Figuras personalizadas', page_name: 'figuras-personalizadas', to: '/figuras-personalizadas', icon: IconCustom },
        { name: 'MCP', page_name: 'mcp', to: '/mcp-info', icon: IconMcp },
    ]), []);

    const closeIfMobile = () => {
        if (!isInMd) setSidebarOpen(false);
    };

    return { style, actualPage, elementos, closeIfMobile };
};
