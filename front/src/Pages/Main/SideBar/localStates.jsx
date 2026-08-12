import { useMemo } from "react";
import { useStates, createState } from "../../../Hooks/useStates";
import style from './styles/index.module.scss';

import { SideBarDefault } from "../SideBarDefault";

export const localStates = () => {
    const { s } = useStates();
    const [sidebarOpen] = createState(['sidebar', 'open'], false);
    const sideMode = useMemo(() => s.sidebar?.sideMode, [s.sidebar?.sideMode]);

    const Component = useMemo(() => {
        switch (sideMode) {
            // Aquí se agregan sidebars específicos por página:
            // case 'algunaPagina': return SideBarAlgunaPagina;
            default:
                return SideBarDefault;
        }
    }, [sideMode]);

    return { style, sidebarOpen, sideMode, Component };
};
