import { useMemo } from "react";
import { useStates, createState } from "../../../Hooks/useStates";
import style from './styles/index.module.scss';

import { MenuBarDefault } from "../MenuBarDefault";

export const localStates = () => {
    const { s } = useStates();
    const [menubarOpen] = createState(['menubar', 'open'], false);
    const menuMode = useMemo(() => s.menubar?.menuMode, [s.menubar?.menuMode]);

    const Component = useMemo(() => {
        switch (menuMode) {
            // Aquí se agregan menús específicos por página:
            // case 'algunaPagina': return MenuBarAlgunaPagina;
            default:
                return MenuBarDefault;
        }
    }, [menuMode]);

    return { style, menubarOpen, menuMode, Component };
};
