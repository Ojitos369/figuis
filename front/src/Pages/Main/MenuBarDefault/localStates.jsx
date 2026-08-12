import { useMemo } from "react";
import { useStates, createState } from "../../../Hooks/useStates";
import style from './styles/index.module.scss';

export const localStates = () => {
    const { ls, lf } = useStates();
    const [, setMenubarOpen] = createState(['menubar', 'open'], false);
    const [isInMd] = createState(['app', 'general', 'isInMd'], window.innerWidth >= 768);
    const theme = useMemo(() => ls?.theme, [ls?.theme]);
    const isDark = theme !== 'white';

    const toggleTheme = () => {
        lf.toggleTheme();
    };

    const closeIfMobile = () => {
        if (!isInMd) setMenubarOpen(false);
    };

    return { style, theme, isDark, toggleTheme, closeIfMobile };
};
