import { Link } from 'react-router-dom';
import { Tag } from '../../../Components/Tag';
import { Info } from '../../../Components/Icons';
import { getTagName } from '../tagUrl';
import { SITE_INSTAGRAM_URL } from '../../../constants/seo';
import instagramIcon from '../../../assets/social/instagram.svg';

export const PageHeader = ({ ls }) => {
    const {
        style, pagination, catalogHeading, catalogSummary,
        selectedTagDetails, getTagHref, activeFiltersCount,
    } = ls;

    const range = pagination && pagination.total > 0
        ? `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)}/${pagination.total}`
        : null;

    return (
        <header className={style.pageHeader}>
            <div className={style.titleRow}>
                <h1 className={style.title}>{catalogHeading}</h1>
                {!!range && <span className={style.rangeBadge} aria-live="polite">{range}</span>}
            </div>
            <div className={style.metaRow}>
                <span className={style.iconTip}>
                    <button type="button" className={style.iconBtn} aria-label="Información del catálogo">
                        <Info size={16} />
                    </button>
                    <span className={style.tooltipBubble} role="tooltip">{catalogSummary}</span>
                </span>
                <span className={style.iconTip}>
                    <a
                        className={style.iconBtn}
                        href={SITE_INSTAGRAM_URL}
                        target="_blank"
                        rel="me noopener noreferrer"
                        aria-label="Instagram: @figuis.3d"
                    >
                        <img src={instagramIcon} alt="" className={style.iconImg} />
                    </a>
                    <span className={style.tooltipBubble} role="tooltip">Instagram: @figuis.3d</span>
                </span>
                <Link className={style.customLink} to="/figuras-personalizadas">
                    Figuras personalizadas
                </Link>
            </div>
            {!!selectedTagDetails.some(tag => getTagName(tag)) && (
                <nav className={style.activeTags} aria-label="Etiquetas activas">
                    <span className={style.activeTagsLabel}>Explorar etiqueta:</span>
                    {selectedTagDetails.map(tag => {
                        const name = getTagName(tag);
                        if (!name) return null;
                        return (
                            <Tag
                                key={tag.id || tag.canonical_id || name}
                                nombre={name}
                                color={tag.color}
                                to={getTagHref(tag)}
                                active
                                size="sm"
                                ariaLabel={`Ver todas las colecciones con la etiqueta ${name}`}
                            />
                        );
                    })}
                </nav>
            )}
            {!!activeFiltersCount && (
                <Link className={style.showAllLink} to="/">Ver todo el catálogo de Figuis</Link>
            )}
        </header>
    );
};
