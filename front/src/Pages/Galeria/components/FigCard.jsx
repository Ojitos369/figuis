import { Tag } from '../../../Components/Tag';
import { MediaThumb } from '../../../Components/MediaThumb';

export const FigCard = ({ figura, style, onOpen }) => {
    return (
        <button type="button" className={style.figCard} onClick={() => onOpen(figura.id)}>
            <div className={style.figThumb}>
                {figura.portada
                    ? <MediaThumb url={figura.portada} alt={figura.nombre} />
                    : <span className={style.figThumbEmpty}>🧸</span>}
            </div>
            <div className={style.figBody}>
                <div className={style.figName}>{figura.nombre}</div>
                {!!figura.etiquetas?.length && (
                    <div className={style.figTags}>
                        {figura.etiquetas.slice(0, 2).map(e => (
                            <Tag key={e.id} nombre={e.nombre} color={e.color} size="sm" />
                        ))}
                        {figura.etiquetas.length > 2 && (
                            <span className={style.figTagsMore}>+{figura.etiquetas.length - 2}</span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
};
