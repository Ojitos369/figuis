import { localStates, localEffects } from "./localStates";

export const SideBar = props => {
    const { style, sidebarOpen, Component } = localStates();
    localEffects();

    return (
        <nav className={`${style.SideBarContent} ${!sidebarOpen && style.hiddeBar}`}>
            {Component && <Component {...props} />}
        </nav>
    )
}
/* */