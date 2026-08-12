import { SheetModal } from '../../../Components/SheetModal';
import { Tag } from '../../../Components/Tag';

const ORDEN_OPTS = [
    { value: 'fecha_desc', label: 'Más recientes' },
    { value: 'fecha_asc', label: 'Más antiguos' },
    { value: 'nombre_asc', label: 'Nombre (A-Z)' },
    { value: 'nombre_desc', label: 'Nombre (Z-A)' },
    { value: 'tags_desc', label: 'Más etiquetas' },
    { value: 'media_desc', label: 'Más contenido' },
];

export const FiltersSheet = ({ ls }) => {
    const {
        style, q, setQ, etiquetas, selectedTags, toggleTag,
        orden, setOrden, filtersOpen, closeFilters, applyFilters, activeFiltersCount, clearFilters,
    } = ls;

    return (
        <SheetModal
            open={filtersOpen}
            onClose={closeFilters}
            title="Buscar y filtrar"
            maxWidth="480px"
            footer={
                <button type="button" className={style.applyFiltersBtn} onClick={applyFilters}>
                    Aplicar {!!activeFiltersCount && `(${activeFiltersCount})`}
                </button>
            }
        >
            <div className={style.filtersBody}>
                <div className={style.searchWrap}>
                    <span className={style.searchIcon}>🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar figuras..."
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        className={style.searchInput}
                        autoFocus
                    />
                </div>

                <div className={style.filterSection}>
                    <span className={style.filterSectionTitle}>Ordenar por</span>
                    <div className={style.sortList}>
                        {ORDEN_OPTS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                className={`${style.sortOption} ${orden === opt.value ? style.sortOptionActive : ''}`}
                                onClick={() => setOrden(opt.value)}
                            >
                                {opt.label}
                                {orden === opt.value && <span>✓</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {!!etiquetas.length && (
                    <div className={style.filterSection}>
                        <span className={style.filterSectionTitle}>Etiquetas</span>
                        <div className={style.filterTagsWrap}>
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
                    </div>
                )}

                {!!activeFiltersCount && (
                    <button type="button" className={style.clearFiltersBtn} onClick={clearFilters}>
                        Limpiar filtros
                    </button>
                )}
            </div>
        </SheetModal>
    );
};
