import { useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useStates } from "../../Hooks/useStates";
import { Sliders } from "../Icons";

// Vive en el Header (fuera del arbol de Galeria), asi que necesita su propio
// acceso al router - el estado de abierto/cerrado vive en la URL (?filtros=1)
// para que el boton "atras" del navegador tambien cierre el sheet.
export const CatalogFilterButton = ({ style }) => {
    const { s } = useStates();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isCatalogo = useMemo(() => s.page?.title === 'Catálogo', [s.page?.title]);
    const filtersOpen = searchParams.get('filtros') === '1';
    const selectedTags = useMemo(() => s.galeria?.selectedTags || [], [s.galeria?.selectedTags]);
    const orden = useMemo(() => s.galeria?.orden || 'nombre_asc', [s.galeria?.orden]);
    const q = useMemo(() => s.galeria?.q || '', [s.galeria?.q]);
    const activeCount = selectedTags.length + (orden !== 'nombre_asc' ? 1 : 0) + (q ? 1 : 0);

    if (!isCatalogo) return null;

    const toggle = () => {
        if (filtersOpen) navigate(-1);
        else navigate(`${location.pathname}?filtros=1`);
    };

    return (
        <button
            type="button"
            className={style.filterBtn}
            onClick={toggle}
            aria-label="Buscar y filtrar"
        >
            <Sliders size={18} />
            {!!activeCount && <span className={style.filterBadge}>{activeCount}</span>}
        </button>
    );
};
