import { Tag } from '../../../Components/Tag';

export const PageHeader = ({ ls }) => {
    const { style, q, setQ, etiquetas, selectedTags, toggleTag } = ls;
    return (
        <div className={style.pageHeader}>
            <div className={style.titleRow}>
                <h1 className={style.title}>🧸 Catálogo</h1>
            </div>
            <div className={style.searchWrap}>
                <span className={style.searchIcon}>🔍</span>
                <input
                    type="text"
                    placeholder="Buscar figuras..."
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    className={style.searchInput}
                />
            </div>
            {!!etiquetas.length && (
                <div className={style.tagsRow}>
                    {etiquetas.map(et => (
                        <Tag
                            key={et.id}
                            nombre={et.nombre}
                            color={et.color}
                            active={selectedTags.includes(et.id)}
                            onClick={() => toggleTag(et.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
