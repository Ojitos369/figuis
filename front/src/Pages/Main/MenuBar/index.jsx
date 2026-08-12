import { localStates } from "./localStates";

// Componente base / contenedor dinámico del MenuBar.
// El contenido concreto lo decide `menuMode`.
export const MenuBar = props => {
    const { style, menubarOpen, Component } = localStates();

    return (
        <div className={`${style.menuBarContent} ${menubarOpen ? style.open : ''}`}>
            <div className={`${style.inner}`}>
                {Component && <Component />}
            </div>
        </div>
    );
};
