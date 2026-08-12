import { Link } from "react-router-dom";
import { localStates } from "./localStates";

// Contenido por defecto del Sidebar (antes vivía en Components/SideBar).
export const SideBarDefault = props => {
    const { style, actualPage, elementos, closeIfMobile } = localStates();

    return (
        <div className={`${style.sideBarDefault}`}>
            <Link to="/" viewTransition className={`${style.brand}`} onClick={closeIfMobile}>
                <span className={`${style.brandDot}`} />
                <span className={`${style.brandName}`}>figuis</span>
            </Link>

            <span className={`${style.sectionLabel}`}>Navegación</span>

            <ul className={`${style.elementsList}`}>
                {elementos.map((ele, index) => {
                    const show = ele.show ?? true;
                    if (!show) return null;
                    const selected = actualPage === ele.page_name;
                    return (
                        <li key={index}>
                            <Link
                                to={ele.to}
                                viewTransition
                                onClick={closeIfMobile}
                                className={`${style.link} ${selected ? style.linkSelected : ''}`}
                            >
                                <span className={`${style.icon}`}>{ele.icon}</span>
                                <span className={`${style.label}`}>{ele.name}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
