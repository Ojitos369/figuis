import { Sun, Moon } from "../../../Components/Icons";
import { localStates } from "./localStates";

// Contenido por defecto del MenuBar (panel de ajustes rápidos).
export const MenuBarDefault = props => {
    const { style, isDark, toggleTheme } = localStates();

    return (
        <div className={`${style.menuBarDefault}`}>
            <span className={`${style.sectionLabel}`}>Ajustes</span>

            <button type="button" className={`${style.row}`} onClick={toggleTheme}>
                <span className={`${style.rowIcon}`}>
                    {isDark ? <Moon /> : <Sun />}
                </span>
                <span className={`${style.rowText}`}>
                    <span className={`${style.rowTitle}`}>Tema</span>
                    <span className={`${style.rowSub}`}>{isDark ? 'Oscuro' : 'Claro'}</span>
                </span>
                <span className={`${style.switch} ${isDark ? style.switchOn : ''}`}>
                    <span className={`${style.knob}`} />
                </span>
            </button>
        </div>
    );
};
