import { Tag } from '../../../Components/Tag';
import { MediaThumb } from '../../../Components/MediaThumb';
import { ReactionSummary } from '../../../Components/ReactionSummary';

export const FigCard = ({ figura, style, onOpen, enterDelay = 0 }) => {
    return (
        <button
            type="button"
            className={`${style.figCard} ${style.figCardIn}`}
            style={{ animationDelay: `${enterDelay}ms` }}
            onClick={() => onOpen(figura.id)}
        >
            <div className={style.figThumb}>
                {figura.portada
                    ? <MediaThumb url={figura.portada} alt={figura.nombre} />
                    : <span className={style.figThumbEmpty}>🧸</span>}
                {!!figura.tiene_3d && (
                    <span className={`${style.thumbBadge} ${style.thumbBadge3d}`}>🧊 3D</span>
                )}
                {!!figura.num_relacionados && (
                    <span className={`${style.thumbBadge} ${style.thumbBadgeMedia}`}>🖼 {figura.num_relacionados}</span>
                )}
            </div>
            <div className={style.figBody}>
                <div className={style.figName}>{figura.nombre}</div>
                <div className={style.figTags}>
                    {figura.etiquetas?.slice(0, 2).map(e => (
                        <Tag key={e.id} nombre={e.nombre} color={e.color} size="sm" />
                    ))}
                    {figura.etiquetas?.length > 2 && (
                        <span className={style.figTagsMore}>+{figura.etiquetas.length - 2}</span>
                    )}
                </div>
                <div className={style.figReactions}>
                    <ReactionSummary reacciones={figura.reacciones_top} />
                </div>
            </div>
        </button>
    );
};
