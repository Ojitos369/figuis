import { localStates } from "./localStates";

// Componente base / contenedor dinámico del Sidebar.
// El contenido concreto lo decide `sideMode` (igual que el MenuBar).
export const SideBar = props => {
    const { style, sidebarOpen, Component } = localStates();

    return (
        <nav className={`${style.sideBarContent} ${sidebarOpen ? style.open : ''}`}>
            <div className={`${style.inner}`}>
                {Component && <Component />}
            </div>
        </nav>
    );
};
