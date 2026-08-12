export const PageHeader = ({ ls }) => {
    const { style, pagination } = ls;

    const range = pagination && pagination.total > 0
        ? `${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)}/${pagination.total}`
        : null;

    return (
        <div className={style.pageHeader}>
            <div className={style.titleRow}>
                <h1 className={style.title}>🧸 Catálogo</h1>
                {!!range && <span className={style.rangeBadge}>{range}</span>}
            </div>
        </div>
    );
};
