import { localStates, localEffects } from './localStates';
import { PageHeader } from './components/PageHeader';
import { FiguraCard } from './components/FiguraCard';
import { FiguraForm } from './components/FiguraForm';
import { Loader } from '../../../Components/Loader';
import { Pagination } from '../../../Components/Pagination';

export const AdminFiguras = () => {
    const ls = localStates();
    localEffects(ls);

    return (
        <div className={ls.style.adminFiguras}>
            <PageHeader ls={ls} />

            {ls.loading && !ls.figuras.length ? (
                <div className={ls.style.loaderWrap}><Loader label="Cargando..." /></div>
            ) : ls.figuras.length === 0 ? (
                <div className={ls.style.emptyState}>
                    <div className={ls.style.emptyIcon}>🧸</div>
                    Aún no hay figuras. Crea la primera.
                </div>
            ) : (
                <div className={ls.style.grid}>
                    {ls.figuras.map(fig => (
                        <FiguraCard key={fig.id} figura={fig} style={ls.style} onEdit={ls.openEdit} onDelete={ls.removeFigura} />
                    ))}
                </div>
            )}

            <Pagination pagination={ls.pagination} onChange={ls.setPage} />

            <FiguraForm
                open={ls.showForm}
                figuraId={ls.editId}
                onClose={ls.closeForm}
                onSaved={() => { ls.reload(); }}
            />
        </div>
    );
};
