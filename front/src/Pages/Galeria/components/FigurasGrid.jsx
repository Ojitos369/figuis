import { FigCard } from './FigCard';
import { FigCardSkeleton } from './FigCardSkeleton';

const SKELETON_COUNT = 8;

export const FigurasGrid = ({ ls }) => {
    const { style, figuras, loading, openDetail, getTagHref, tagNotFound, loadingTag } = ls;

    if (tagNotFound) {
        return (
            <div className={style.emptyState} role="status">
                <div className={style.emptyIcon}>🏷️</div>
                La etiqueta solicitada no existe o ya no está disponible.
            </div>
        );
    }

    if ((loading || loadingTag) && !figuras.length) {
        return (
            <div className={style.grid}>
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                    <FigCardSkeleton key={i} style={style} />
                ))}
            </div>
        );
    }

    if (!loading && figuras.length === 0) {
        return (
            <div className={style.emptyState}>
                <div className={style.emptyIcon}>🧸</div>
                No se encontraron figuras.
            </div>
        );
    }

    return (
        <div className={style.grid}>
            {figuras.map((f, i) => (
                <FigCard
                    key={f.id}
                    figura={f}
                    style={style}
                    onOpen={openDetail}
                    getTagHref={getTagHref}
                    enterDelay={Math.min(i, 11) * 30}
                />
            ))}
        </div>
    );
};
