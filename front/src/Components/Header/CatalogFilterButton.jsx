import { useMemo } from "react";
import { useStates, createState } from "../../Hooks/useStates";
import { Sliders } from "../Icons";

export const CatalogFilterButton = ({ style }) => {
    const { s } = useStates();
    const isCatalogo = useMemo(() => s.page?.title === 'Catálogo', [s.page?.title]);
    const [filtersOpen, setFiltersOpen] = createState(['galeria', 'filtersOpen'], false);
    const selectedTags = useMemo(() => s.galeria?.selectedTags || [], [s.galeria?.selectedTags]);
    const orden = useMemo(() => s.galeria?.orden || 'nombre_asc', [s.galeria?.orden]);
    const q = useMemo(() => s.galeria?.q || '', [s.galeria?.q]);
    const activeCount = selectedTags.length + (orden !== 'nombre_asc' ? 1 : 0) + (q ? 1 : 0);

    if (!isCatalogo) return null;

    return (
        <button
            type="button"
            className={style.filterBtn}
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-label="Buscar y filtrar"
        >
            <Sliders size={18} />
            {!!activeCount && <span className={style.filterBadge}>{activeCount}</span>}
        </button>
    );
};
