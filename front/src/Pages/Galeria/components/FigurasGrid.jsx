import { FigCard } from './FigCard';
import { Loader } from '../../../Components/Loader';

export const FigurasGrid = ({ ls }) => {
    const { style, figuras, loading, openDetail } = ls;

    if (loading && !figuras.length) {
        return <div className={style.loaderWrap}><Loader label="Cargando figuras..." /></div>;
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
            {figuras.map(f => (
                <FigCard key={f.id} figura={f} style={style} onOpen={openDetail} />
            ))}
        </div>
    );
};
