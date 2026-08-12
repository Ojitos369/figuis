import { Tag } from '../../../../Components/Tag';
import { MediaThumb } from '../../../../Components/MediaThumb';

export const FiguraCard = ({ figura, style, onEdit, onDelete }) => {
    return (
        <div className={style.figuraCard} onClick={() => onEdit(figura)}>
            <div className={style.thumb}>
                {figura.portada
                    ? <MediaThumb url={figura.portada} alt={figura.nombre} />
                    : <span className={style.thumbEmpty}>🧸</span>}
                <span className={`${style.badge} ${figura.estatus === 'publico' ? style.badgePublic : style.badgeDraft}`}>
                    {figura.estatus === 'publico' ? 'Público' : 'Borrador'}
                </span>
            </div>
            <div className={style.body}>
                <div className={style.name}>{figura.nombre}</div>
                <div className={style.meta}>{figura.num_archivos || 0} archivo{figura.num_archivos !== 1 ? 's' : ''}</div>
                {!!figura.etiquetas?.length && (
                    <div className={style.tags}>
                        {figura.etiquetas.slice(0, 3).map(e => (
                            <Tag key={e.id} nombre={e.nombre} color={e.color} size="sm" />
                        ))}
                    </div>
                )}
            </div>
            <button
                type="button"
                className={style.deleteBtn}
                onClick={(e) => { e.stopPropagation(); onDelete(figura); }}
                aria-label={`Eliminar ${figura.nombre}`}
            >
                🗑
            </button>
        </div>
    );
};
