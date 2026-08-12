import { Link } from "react-router-dom";
import { localStates } from "./localStates";
import { SidebarIcon } from "../SidebarIcon";

export const SidebarIndexPart = () => {
    const { style } = localStates();
    return (
        <div className={`${style.menuIndexPart}`}>
            <div className={`${style.sidebarIcon}`}>
                <SidebarIcon />
            </div>
            <Link to="/" className={`${style.brand}`}>
                <span className={`${style.brandDot}`} />
                <span className={`${style.brandName}`}>reapi</span>
            </Link>
        </div>
    );
};
