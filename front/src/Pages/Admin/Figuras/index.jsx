import { localStates, localEffects } from './localStates';
import { PageHeader } from './components/PageHeader';
import { AdminFiltersSheet } from './components/AdminFiltersSheet';
import { FiguraCard } from './components/FiguraCard';
import { FiguraCardSkeleton } from './components/FiguraCardSkeleton';
import { FiguraForm } from './components/FiguraForm';
import { Pagination } from '../../../Components/Pagination';

const SKELETON_COUNT = 8;

export const AdminFiguras = () => {
    const ls = localStates();
    localEffects(ls);

    return (
        <div className={ls.style.adminFiguras}>
            <PageHeader ls={ls} />
            <Pagination pagination={ls.pagination} onChange={ls.setPage} />

            {ls.loading && !ls.figuras.length ? (
                <div className={ls.style.grid}>
                    {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                        <FiguraCardSkeleton key={i} style={ls.style} />
                    ))}
                </div>
            ) : ls.figuras.length === 0 ? (
                <div className={ls.style.emptyState}>
                    <div className={ls.style.emptyIcon}>🧸</div>
                    Aún no hay figuras. Crea la primera.
                </div>
            ) : (
                <div className={ls.style.grid}>
                    {ls.figuras.map((fig, i) => (
                        <FiguraCard key={fig.id} figura={fig} style={ls.style} onEdit={ls.openEdit} onDelete={ls.removeFigura} enterDelay={Math.min(i, 11) * 30} />
                    ))}
                </div>
            )}

            <Pagination pagination={ls.pagination} onChange={ls.setPage} />

            <AdminFiltersSheet ls={ls} />

            <FiguraForm
                open={ls.showForm}
                figuraId={ls.editId}
                onClose={ls.closeForm}
                onSaved={() => { ls.reload(); }}
            />
        </div>
    );
};
