import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useStates, createState } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const figuras = useMemo(() => s.catalogo?.figuras || [], [s.catalogo?.figuras]);
    const pagination = useMemo(() => s.catalogo?.pagination || null, [s.catalogo?.pagination]);
    const loading = useMemo(() => s.loadings?.catalogo?.figuras, [s.loadings?.catalogo?.figuras]);
    const etiquetas = useMemo(() => s.catalogo?.etiquetas || [], [s.catalogo?.etiquetas]);
    const reaccionesDisponibles = useMemo(() => s.catalogo?.reaccionesDisponibles || [], [s.catalogo?.reaccionesDisponibles]);

    const figuraActual = useMemo(() => s.catalogo?.figuraActual, [s.catalogo?.figuraActual]);
    const loadingDetail = useMemo(() => s.loadings?.catalogo?.figura, [s.loadings?.catalogo?.figura]);

    const [q, setQ] = createState(['galeria', 'q'], '');
    const [selectedTags, setSelectedTags] = createState(['galeria', 'selectedTags'], []);
    const [selectedReacciones, setSelectedReacciones] = createState(['galeria', 'selectedReacciones'], []);
    const [page, setPage] = createState(['galeria', 'page'], 1);
    const [orden, setOrdenRaw] = createState(['galeria', 'orden'], 'fecha_desc');
    const [desde, setDesde] = createState(['galeria', 'desde'], '');
    const [hasta, setHasta] = createState(['galeria', 'hasta'], '');

    // El sheet de filtros se abre/cierra con el router (?filtros=1), no con un
    // booleano suelto: asi el boton "atras" del navegador tambien lo cierra.
    const filtersOpen = searchParams.get('filtros') === '1';
    const openFilters = useCallback(() => {
        navigate(`${location.pathname}?filtros=1`);
    }, [navigate, location.pathname]);
    const closeFilters = useCallback(() => {
        navigate(-1);
    }, [navigate]);
    const applyFilters = useCallback(() => {
        f.catalogo.getFiguras({
            q: q || undefined,
            etiquetas: selectedTags.length ? selectedTags.join(',') : undefined,
            reacciones: selectedReacciones.length ? selectedReacciones.join(',') : undefined,
            orden: orden || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            page: 1,
            limit: 24,
        });
        navigate('/');
    }, [navigate, f.catalogo, q, selectedTags, selectedReacciones, orden, desde, hasta]);

    const toggleTag = useCallback((tagId) => {
        const next = selectedTags.includes(tagId)
            ? selectedTags.filter(t => t !== tagId)
            : [...selectedTags, tagId];
        setSelectedTags(next);
        setPage(1);
    }, [selectedTags]);

    const toggleReaccionFiltro = useCallback((emoji) => {
        const next = selectedReacciones.includes(emoji)
            ? selectedReacciones.filter(e => e !== emoji)
            : [...selectedReacciones, emoji];
        setSelectedReacciones(next);
        setPage(1);
    }, [selectedReacciones]);

    const setQAndResetPage = useCallback((value) => {
        setQ(value);
        setPage(1);
    }, []);

    const setOrden = useCallback((value) => {
        setOrdenRaw(value);
        setPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setQ('');
        setSelectedTags([]);
        setSelectedReacciones([]);
        setOrdenRaw('fecha_desc');
        setDesde('');
        setHasta('');
        setPage(1);
    }, []);

    const activeFiltersCount = useMemo(
        () => selectedTags.length + selectedReacciones.length + (orden !== 'fecha_desc' ? 1 : 0) + (q ? 1 : 0) + (desde ? 1 : 0) + (hasta ? 1 : 0),
        [selectedTags, selectedReacciones, orden, q, desde, hasta]
    );

    const openDetail = useCallback((figuraId) => {
        navigate(`/figura/${figuraId}`);
    }, [navigate]);

    const closeDetail = useCallback(() => {
        navigate('/');
    }, [navigate]);

    return {
        style, id, figuras, pagination, loading, etiquetas, reaccionesDisponibles,
        figuraActual, loadingDetail,
        q, setQ: setQAndResetPage, selectedTags, toggleTag,
        selectedReacciones, toggleReaccionFiltro, page, setPage,
        orden, setOrden, desde, setDesde, hasta, setHasta,
        filtersOpen, openFilters, closeFilters, applyFilters, activeFiltersCount, clearFilters,
        openDetail, closeDetail,
    };
};

export const localEffects = (ls) => {
    const { f } = useStates();

    useEffect(() => {
        f.auth.validateLogin();
    }, []);

    useEffect(() => {
        f.u1('page', 'title', 'Catálogo');
        f.u1('sidebar', 'sideMode', undefined);
        f.catalogo.getEtiquetas();
        f.catalogo.getReacciones();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            f.catalogo.getFiguras({
                q: ls.q || undefined,
                etiquetas: ls.selectedTags.length ? ls.selectedTags.join(',') : undefined,
                reacciones: ls.selectedReacciones.length ? ls.selectedReacciones.join(',') : undefined,
                orden: ls.orden || undefined,
                desde: ls.desde || undefined,
                hasta: ls.hasta || undefined,
                page: ls.page,
                limit: 24,
            });
        }, 300);
        return () => clearTimeout(t);
    }, [ls.q, ls.selectedTags, ls.selectedReacciones, ls.orden, ls.desde, ls.hasta, ls.page]);

    useEffect(() => {
        if (ls.id) {
            f.catalogo.getFigura(ls.id);
        }
    }, [ls.id]);

    // al entrar al detalle de una figura se cambia el titulo de la pestana al
    // nombre de la figura; al salir (o si no se encontro) vuelve al del catalogo.
    useEffect(() => {
        if (!ls.id) {
            document.title = 'Figuis · Catálogo';
            return;
        }
        if (ls.figuraActual && ls.figuraActual.nombre) {
            document.title = `${ls.figuraActual.nombre} · Figuis`;
        }
        return () => { document.title = 'Figuis · Catálogo'; };
    }, [ls.id, ls.figuraActual]);
};
