import { Link, useLocation } from 'react-router-dom';
import { Tag } from '../../../Components/Tag';
import { MediaThumb } from '../../../Components/MediaThumb';
import { ReactionSummary } from '../../../Components/ReactionSummary';
import { getCanonicalFiguraIdentifier, getFiguraPath } from '../figuraUrl';

export const FigCard = ({ figura, style, onOpen, getTagHref, enterDelay = 0 }) => {
    const location = useLocation();
    const identifier = getCanonicalFiguraIdentifier(figura);
    const detailPath = `${getFiguraPath(identifier)}${location.search}`;

    const handleOpen = (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button === 1) return;
        event.preventDefault();
        onOpen(identifier);
    };

    return (
        <article
            className={`${style.figCard} ${style.figCardIn}`}
            style={{ animationDelay: `${enterDelay}ms` }}
        >
            <Link
                to={detailPath}
                className={style.figThumbLink}
                onClick={handleOpen}
                aria-label={`Ver ${figura.nombre}`}
            >
                <div className={style.figThumb}>
                    {figura.portada
                        ? <MediaThumb url={figura.portada} alt={figura.nombre} />
                        : <span className={style.figThumbEmpty}>🧸</span>}
                    {!!figura.num_relacionados && (
                        <span className={`${style.thumbBadge} ${style.thumbBadgeMedia}`}>🖼 {figura.num_relacionados}</span>
                    )}
                </div>
            </Link>
            <div className={style.figBody}>
                <h2 className={style.figName}>
                    <Link to={detailPath} className={style.figNameLink} onClick={handleOpen}>
                        {figura.nombre}
                    </Link>
                </h2>
                <div className={style.figTags}>
                    {figura.etiquetas?.slice(0, 2).map(e => (
                        <Tag
                            key={e.id}
                            nombre={e.nombre}
                            color={e.color}
                            size="sm"
                            to={getTagHref(e)}
                            ariaLabel={`Ver colecciones con la etiqueta ${e.nombre}`}
                        />
                    ))}
                    {figura.etiquetas?.length > 2 && (
                        <span className={style.figTagsMore}>+{figura.etiquetas.length - 2}</span>
                    )}
                </div>
                <div className={style.figReactions}>
                    <ReactionSummary reacciones={figura.reacciones_top} />
                </div>
            </div>
        </article>
    );
};
