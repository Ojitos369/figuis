import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useStates, createState } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

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
    const [limit, setLimit] = createState(['galeria', 'limit'], 24);

    // El sheet de filtros se abre/cierra con el router (?filtros=1), no con un
    // booleano suelto: asi el boton "atras" del navegador tambien lo cierra.
    const filtersOpen = searchParams.get('filtros') === '1';
    const openFilters = useCallback(() => {
        const params = new URLSearchParams(location.search);
        params.set('filtros', '1');
        navigate(`${location.pathname}?${params.toString()}`);
    }, [navigate, location.pathname, location.search]);
    const closeFilters = useCallback(() => {
        navigate(-1);
    }, [navigate]);
    const applyFilters = useCallback(() => {
        setPage(1);
        f.catalogo.getFiguras({
            q: q || undefined,
            etiquetas: selectedTags.length ? selectedTags.join(',') : undefined,
            reacciones: selectedReacciones.length ? selectedReacciones.join(',') : undefined,
            orden: orden || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            page: 1,
            limit,
        });
        navigate('/');
    }, [navigate, f.catalogo, q, selectedTags, selectedReacciones, orden, desde, hasta, limit]);

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

    const getPageHref = useCallback((p) => {
        const params = new URLSearchParams(location.search);
        if (p > 1) params.set('page', String(p));
        else params.delete('page');
        const qs = params.toString();
        return `${location.pathname}${qs ? `?${qs}` : ''}`;
    }, [location.pathname, location.search]);

    const openDetail = useCallback((figuraId) => {
        navigate(`/figura/${figuraId}${location.search}`);
    }, [navigate, location.search]);

    const closeDetail = useCallback(() => {
        navigate(`/${location.search}`);
    }, [navigate, location.search]);

    // Hidrata los filtros/pagina/limite desde la URL al entrar (link
    // compartido, recarga de pagina): solo corre una vez al montar.
    useEffect(() => {
        const spQ = searchParams.get('s');
        const spTags = searchParams.get('tags');
        const spReacciones = searchParams.get('reacciones');
        const spOrden = searchParams.get('orden');
        const spDesde = searchParams.get('desde');
        const spHasta = searchParams.get('hasta');
        const spLimit = searchParams.get('limit');
        const spPage = searchParams.get('page');

        if (spQ !== null) setQ(spQ);
        if (spTags) setSelectedTags(spTags.split(',').filter(Boolean));
        if (spReacciones) setSelectedReacciones(spReacciones.split(',').filter(Boolean));
        if (spOrden) setOrdenRaw(spOrden);
        if (spDesde) setDesde(spDesde);
        if (spHasta) setHasta(spHasta);
        if (spLimit) setLimit(Number(spLimit) || 24);
        if (spPage) setPage(Number(spPage) || 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mantiene la URL en sync con los filtros/pagina/limite actuales para que
    // siempre se pueda copiar y reproduzca la misma vista al abrirla de nuevo.
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchParams.get('filtros') === '1') params.set('filtros', '1');
        if (q) params.set('s', q);
        if (selectedTags.length) params.set('tags', selectedTags.join(','));
        if (selectedReacciones.length) params.set('reacciones', selectedReacciones.join(','));
        if (orden && orden !== 'fecha_desc') params.set('orden', orden);
        if (desde) params.set('desde', desde);
        if (hasta) params.set('hasta', hasta);
        if (page && page !== 1) params.set('page', String(page));
        if (limit && limit !== 24) params.set('limit', String(limit));
        setSearchParams(params, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, selectedTags, selectedReacciones, orden, desde, hasta, page, limit]);

    return {
        style, id, figuras, pagination, loading, etiquetas, reaccionesDisponibles,
        figuraActual, loadingDetail,
        q, setQ: setQAndResetPage, selectedTags, toggleTag,
        selectedReacciones, toggleReaccionFiltro, page, setPage,
        orden, setOrden, desde, setDesde, hasta, setHasta, limit,
        filtersOpen, openFilters, closeFilters, applyFilters, activeFiltersCount, clearFilters,
        openDetail, closeDetail, getPageHref,
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
                limit: ls.limit,
            });
        }, 300);
        return () => clearTimeout(t);
    }, [ls.q, ls.selectedTags, ls.selectedReacciones, ls.orden, ls.desde, ls.hasta, ls.page, ls.limit]);

    useEffect(() => {
        if (ls.id) {
            f.catalogo.getFigura(ls.id);
        }
    }, [ls.id]);

    // Si se entra directo a /figura/:id (link compartido, nueva pestana,
    // recargar la pagina) el paginador de fondo arranca en la pagina 1 sin
    // saber en cual vive realmente esa figura. Solo se resuelve una vez, al
    // montar: si el detalle se abrio con un click desde la grilla, ese click
    // ya ocurrio en la pagina correcta y no hace falta tocarla.
    useEffect(() => {
        if (!ls.id) return;
        f.catalogo.getFiguraPagina(ls.id, {
            q: ls.q || undefined,
            etiquetas: ls.selectedTags.length ? ls.selectedTags.join(',') : undefined,
            reacciones: ls.selectedReacciones.length ? ls.selectedReacciones.join(',') : undefined,
            orden: ls.orden || undefined,
            desde: ls.desde || undefined,
            hasta: ls.hasta || undefined,
            limit: ls.limit,
        }, (result) => {
            if (result?.page) ls.setPage(result.page);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
