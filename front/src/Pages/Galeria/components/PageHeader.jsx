export const PageHeader = ({ ls }) => {
    const { style } = ls;
    return (
        <div className={style.pageHeader}>
            <div className={style.titleRow}>
                <h1 className={style.title}>🧸 Catálogo</h1>
            </div>
        </div>
    );
};
