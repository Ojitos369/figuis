import style from './styles/index.module.scss';

export const BaseTable = ({ columns = [], rows = [], onRowClick, emptyMessage = 'Sin datos' }) => {
    return (
        <div className={style.tableWrapper}>
            <table className={style.table}>
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i} className={style.th}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0
                        ? (
                            <tr>
                                <td colSpan={columns.length} className={style.empty}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )
                        : rows.map((row, i) => (
                            <tr
                                key={row.id ?? i}
                                className={`${style.tr} ${onRowClick ? style.clickable : ''}`}
                                onClick={() => onRowClick?.(row)}
                            >
                                {columns.map((col, j) => (
                                    <td key={j} className={style.td}>
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    );
};
