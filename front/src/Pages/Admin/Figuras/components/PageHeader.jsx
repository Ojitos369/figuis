export const PageHeader = ({ ls }) => {
    const { style, q, setQ, estatus, setEstatus, openCreate } = ls;
    return (
        <div className={style.pageHeader}>
            <div className={style.searchRow}>
                <input
                    type="text"
                    className={style.searchInput}
                    placeholder="Buscar figuras..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                />
                <select className={style.statusSelect} value={estatus} onChange={e => setEstatus(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="publico">Público</option>
                    <option value="borrador">Borrador</option>
                </select>
            </div>
            <button type="button" className={style.newBtn} onClick={openCreate}>
                <span>+</span> Nueva figura
            </button>
        </div>
    );
};
