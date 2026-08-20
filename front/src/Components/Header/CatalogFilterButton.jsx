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
    const selectedTags = (searchParams.get('tags') || '').split(',').filter(Boolean);
    const selectedReacciones = (searchParams.get('reacciones') || '').split(',').filter(Boolean);
    const orden = searchParams.get('orden') || 'fecha_desc';
    const q = searchParams.get('s') || '';
    const desde = searchParams.get('desde') || '';
    const hasta = searchParams.get('hasta') || '';
    const routeTagCount = location.pathname.startsWith('/etiqueta/') ? 1 : 0;
    const activeCount = selectedTags.length
        + selectedReacciones.length
        + routeTagCount
        + (orden !== 'fecha_desc' ? 1 : 0)
        + (q ? 1 : 0)
        + (desde ? 1 : 0)
        + (hasta ? 1 : 0);

    if (!isCatalogo) return null;

    const toggle = () => {
        if (filtersOpen) navigate(-1);
        else {
            const params = new URLSearchParams(location.search);
            params.set('filtros', '1');
            navigate(`${location.pathname}?${params.toString()}`);
        }
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
