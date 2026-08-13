import { useMemo, useState } from 'react';
import { SheetModal } from '../../../Components/SheetModal';
import { Tag } from '../../../Components/Tag';

const ORDEN_OPTS = [
    { value: 'fecha_desc', label: 'Más recientes' },
    { value: 'fecha_asc', label: 'Más antiguos' },
    { value: 'nombre_asc', label: 'Nombre (A-Z)' },
    { value: 'nombre_desc', label: 'Nombre (Z-A)' },
    { value: 'tags_desc', label: 'Más etiquetas' },
    { value: 'media_desc', label: 'Más contenido' },
    { value: 'reacciones_desc', label: 'Más reaccionadas' },
];

export const FiltersSheet = ({ ls }) => {
    const {
        style, q, setQ, etiquetas, selectedTags, toggleTag,
        reaccionesDisponibles, selectedReacciones, toggleReaccionFiltro,
        orden, setOrden, desde, setDesde, hasta, setHasta,
        filtersOpen, closeFilters, applyFilters, activeFiltersCount, clearFilters,
    } = ls;

    // Solo filtra la lista de etiquetas que se muestra (no pega al back);
    // no necesita vivir en la URL/redux, es puramente de este sheet.
    const [tagSearch, setTagSearch] = useState('');
    const filteredEtiquetas = useMemo(() => {
        const q2 = tagSearch.trim().toLowerCase();
        if (!q2) return etiquetas;
        return etiquetas.filter(et => et.nombre.toLowerCase().includes(q2));
    }, [etiquetas, tagSearch]);

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
                <div className={style.filterSection}>
                    <div className={style.searchWrap}>
                        <span className={style.searchIcon}>🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, código o id..."
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            className={style.searchInput}
                            autoFocus
                        />
                    </div>
                    <span className={style.searchHint}>Admite expresiones regulares (regex).</span>
                </div>

                <div className={style.filterSection}>
                    <span className={style.filterSectionTitle}>Rango de fechas</span>
                    <div className={style.dateRangeRow}>
                        <input
                            type="date"
                            value={desde}
                            onChange={e => setDesde(e.target.value)}
                            className={style.dateInput}
                            aria-label="Desde"
                        />
                        <span className={style.dateRangeSep}>—</span>
                        <input
                            type="date"
                            value={hasta}
                            onChange={e => setHasta(e.target.value)}
                            className={style.dateInput}
                            aria-label="Hasta"
                        />
                    </div>
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
                        <input
                            type="text"
                            placeholder="Filtrar etiquetas..."
                            value={tagSearch}
                            onChange={e => setTagSearch(e.target.value)}
                            className={style.tagSearchInput}
                        />
                        <div className={style.filterTagsWrap}>
                            {filteredEtiquetas.map(et => (
                                <Tag
                                    key={et.id}
                                    nombre={et.nombre}
                                    color={et.color}
                                    active={selectedTags.includes(et.id)}
                                    onClick={() => toggleTag(et.id)}
                                />
                            ))}
                            {!filteredEtiquetas.length && (
                                <span className={style.tagSearchEmpty}>Sin coincidencias.</span>
                            )}
                        </div>
                    </div>
                )}

                {!!reaccionesDisponibles.length && (
                    <div className={style.filterSection}>
                        <span className={style.filterSectionTitle}>Reacciones</span>
                        <div className={style.filterTagsWrap}>
                            {reaccionesDisponibles.map(r => {
                                const active = selectedReacciones.includes(r.emoji);
                                return (
                                    <button
                                        key={r.emoji}
                                        type="button"
                                        className={`${style.reactionChip} ${active ? style.reactionChipActive : ''}`}
                                        onClick={() => toggleReaccionFiltro(r.emoji)}
                                    >
                                        <span>{r.emoji}</span>
                                        <span className={style.reactionChipCount}>{r.num_figuras}</span>
                                    </button>
                                );
                            })}
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
