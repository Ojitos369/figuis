import { useMemo } from "react";
import { useStates, createState } from "../../../Hooks/useStates";
import style from './styles/index.module.scss';

// Iconos minimalistas (stroke) reutilizables como elementos del menú
const IconHome = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
    </svg>
);
const IconChat = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z" />
    </svg>
);
const IconBeaker = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2.3h11.4A1.5 1.5 0 0 0 19 19l-5-10V3" />
    </svg>
);

export const localStates = () => {
    const { s } = useStates();
    const [, setSidebarOpen] = createState(['sidebar', 'open'], false);
    const [isInMd] = createState(['app', 'general', 'isInMd'], window.innerWidth >= 768);
    const actualPage = useMemo(() => s.page?.actual || '', [s.page?.actual]);

    // Contenido dinámico del sidebar (mapeado en el render)
    const elementos = useMemo(() => ([
        { name: 'Inicio', page_name: 'index', to: '/', icon: IconHome },
        { name: 'Chat',   page_name: 'chat',  to: '/chat', icon: IconChat },
        { name: 'Test',   page_name: 'test',  to: '/test', icon: IconBeaker },
    ]), []);

    const closeIfMobile = () => {
        if (!isInMd) setSidebarOpen(false);
    };

    return { style, actualPage, elementos, closeIfMobile };
};
