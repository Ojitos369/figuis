import { User as UserIcon } from '../Icons';
import { localStates } from "./localStates";

export const UserPart = () => {
    const { openUserMenu, style, menubarOpen } = localStates();
    return (
        <div className={`${style.userPart}`}>
            <UserIcon className="manita" onClick={openUserMenu} open={menubarOpen} />
        </div>
    )
}