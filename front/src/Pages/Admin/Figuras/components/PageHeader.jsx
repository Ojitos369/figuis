export const PageHeader = ({ ls }) => {
    const { style, activeFiltersCount, setFiltersOpen, openCreate, pagination } = ls;

    const range = pagination && pagination.total > 0
        ? `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)}/${pagination.total}`
        : null;

    return (
        <div className={style.pageHeader}>
            <div className={style.headerRow}>
                {!!range && <span className={style.rangeBadge}>{range}</span>}
                <button type="button" className={style.filtersBtn} onClick={() => setFiltersOpen(true)}>
                    🔍 Filtros {!!activeFiltersCount && <span className={style.filtersBadge}>{activeFiltersCount}</span>}
                </button>
            </div>
            <button type="button" className={style.newBtn} onClick={openCreate}>
                <span>+</span> Nueva figura
            </button>
        </div>
    );
};
