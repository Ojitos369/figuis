import { Link } from 'react-router-dom';
import style from './styles/index.module.scss';

// Controles de paginacion: solo pide/renderiza la pagina actual (no toda la lista de una vez).
// getHref (opcional) da la URL real de cada pagina para que ctrl+click / click de
// rueda puedan abrirla en otra pestaña; sin ella se renderizan botones normales.
export const Pagination = ({ pagination, onChange, getHref }) => {
    if (!pagination || pagination.total_pages <= 1) return null;

    const { page, total_pages, total } = pagination;
    const goTo = (p) => {
        if (p < 1 || p > total_pages || p === page) return;
        onChange(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleClick = (p) => (e) => {
        if (getHref && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button === 1)) return;
        e.preventDefault();
        goTo(p);
    };

    // Boton/enlace de pagina: <Link> real cuando hay getHref (permite abrir en
    // otra pestaña/ventana), <button> normal en el resto de los casos.
    const PageControl = ({ p, className, children, ariaLabel, ariaCurrent }) => (
        getHref ? (
            <Link
                to={getHref(p)}
                className={className}
                onClick={handleClick(p)}
                aria-label={ariaLabel}
                aria-current={ariaCurrent}
            >
                {children}
            </Link>
        ) : (
            <button
                type="button"
                className={className}
                onClick={() => goTo(p)}
                aria-label={ariaLabel}
                aria-current={ariaCurrent}
            >
                {children}
            </button>
        )
    );

    // Ventana de paginas visibles alrededor de la actual (maximo 5 botones numericos).
    const windowStart = Math.max(1, Math.min(page - 2, total_pages - 4));
    const pages = Array.from(
        { length: Math.min(5, total_pages) },
        (_, i) => windowStart + i
    ).filter(p => p >= 1 && p <= total_pages);

    return (
        <nav className={style.pagination} aria-label="Paginación">
            {page <= 1 ? (
                <button type="button" className={style.navBtn} disabled aria-label="Página anterior">‹</button>
            ) : (
                <PageControl p={page - 1} className={style.navBtn} ariaLabel="Página anterior">‹</PageControl>
            )}

            {windowStart > 1 && (
                <>
                    <PageControl p={1} className={style.pageBtn}>1</PageControl>
                    {windowStart > 2 && <span className={style.ellipsis}>…</span>}
                </>
            )}

            {pages.map(p => (
                <PageControl
                    key={p}
                    p={p}
                    className={`${style.pageBtn} ${p === page ? style.pageActive : ''}`}
                    ariaCurrent={p === page ? 'page' : undefined}
                >
                    {p}
                </PageControl>
            ))}

            {windowStart + pages.length - 1 < total_pages && (
                <>
                    {windowStart + pages.length - 1 < total_pages - 1 && <span className={style.ellipsis}>…</span>}
                    <PageControl p={total_pages} className={style.pageBtn}>{total_pages}</PageControl>
                </>
            )}

            {page >= total_pages ? (
                <button type="button" className={style.navBtn} disabled aria-label="Página siguiente">›</button>
            ) : (
                <PageControl p={page + 1} className={style.navBtn} ariaLabel="Página siguiente">›</PageControl>
            )}

            <span className={style.total}>{total} en total</span>
        </nav>
    );
};
