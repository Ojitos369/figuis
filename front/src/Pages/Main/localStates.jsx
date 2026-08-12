import { useMemo, useEffect } from "react";
import { useStates, createState } from "../../Hooks/useStates";
import style from './style/index.module.scss';

export const localStates = () => {
    const [isInMd, setIsInMd] = createState(['app', 'general', 'isInMd'], window.innerWidth >= 768);
    const [sidebarOpen, setSidebarOpen] = createState(['sidebar', 'open'], false);
    const [menubarOpen, setMenubarOpen] = createState(['menubar', 'open'], false);

    const init = () => {
        setIsInMd(window.innerWidth >= 768);
        setSidebarOpen(false);
    };

    const closeBars = () => {
        setSidebarOpen(false);
        setMenubarOpen(false);
    };

    // Scrim solo en móvil (las barras se superponen y toman todo el ancho).
    const showScrim = useMemo(
        () => !isInMd && (sidebarOpen || menubarOpen),
        [isInMd, sidebarOpen, menubarOpen]
    );

    // En desktop las barras ocupan su columna (sin tapar el contenido).
    const openSectionClass = useMemo(() => {
        if (!sidebarOpen && !menubarOpen) return '';
        if (sidebarOpen && !menubarOpen) return 'sidebarOpen';
        if (!sidebarOpen && menubarOpen) return 'menubarOpen';
        return 'bothOpen';
    }, [sidebarOpen, menubarOpen]);

    return {
        style, showScrim, closeBars, openSectionClass,
        isInMd, setIsInMd, sidebarOpen, menubarOpen, init,
    };
};

export const localEffects = () => {
    const { init, setIsInMd } = localStates();

    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        const handleResize = () => setIsInMd(window.innerWidth >= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
};
