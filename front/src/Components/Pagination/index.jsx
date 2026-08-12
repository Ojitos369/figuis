import style from './styles/index.module.scss';

// Controles de paginacion: solo pide/renderiza la pagina actual (no toda la lista de una vez).
export const Pagination = ({ pagination, onChange }) => {
    if (!pagination || pagination.total_pages <= 1) return null;

    const { page, total_pages, total } = pagination;
    const goTo = (p) => {
        if (p < 1 || p > total_pages || p === page) return;
        onChange(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Ventana de paginas visibles alrededor de la actual (maximo 5 botones numericos).
    const windowStart = Math.max(1, Math.min(page - 2, total_pages - 4));
    const pages = Array.from(
        { length: Math.min(5, total_pages) },
        (_, i) => windowStart + i
    ).filter(p => p >= 1 && p <= total_pages);

    return (
        <nav className={style.pagination} aria-label="Paginación">
            <button
                type="button"
                className={style.navBtn}
                onClick={() => goTo(page - 1)}
                disabled={page <= 1}
                aria-label="Página anterior"
            >
                ‹
            </button>

            {windowStart > 1 && (
                <>
                    <button type="button" className={style.pageBtn} onClick={() => goTo(1)}>1</button>
                    {windowStart > 2 && <span className={style.ellipsis}>…</span>}
                </>
            )}

            {pages.map(p => (
                <button
                    key={p}
                    type="button"
                    className={`${style.pageBtn} ${p === page ? style.pageActive : ''}`}
                    onClick={() => goTo(p)}
                    aria-current={p === page ? 'page' : undefined}
                >
                    {p}
                </button>
            ))}

            {windowStart + pages.length - 1 < total_pages && (
                <>
                    {windowStart + pages.length - 1 < total_pages - 1 && <span className={style.ellipsis}>…</span>}
                    <button type="button" className={style.pageBtn} onClick={() => goTo(total_pages)}>{total_pages}</button>
                </>
            )}

            <button
                type="button"
                className={style.navBtn}
                onClick={() => goTo(page + 1)}
                disabled={page >= total_pages}
                aria-label="Página siguiente"
            >
                ›
            </button>

            <span className={style.total}>{total} en total</span>
        </nav>
    );
};
