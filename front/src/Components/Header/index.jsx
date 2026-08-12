import { SidebarIndexPart } from "./SidebarIndexPart";
import { UserPart } from "./UserPart";
import { CatalogFilterButton } from "./CatalogFilterButton";
import { localStates, localEffects } from "./localStates";


export const Header = props => {
    const { dev_mode, style, pageTitle } = localStates();
    localEffects();

    return (
        <header className={`${style.headerContent} ${dev_mode && style.devModeBC}`}>
            <SidebarIndexPart />
            <div className={`${style.titleGroup}`}>
                {!!pageTitle &&
                    <h1 className={`${style.pageTitle}`}>{pageTitle}</h1>
                }
                <CatalogFilterButton style={style} />
            </div>
            <UserPart />
        </header>
    )
}
/* 

*/