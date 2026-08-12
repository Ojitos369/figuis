import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStates, createState } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();
    const { id } = useParams();
    const navigate = useNavigate();

    const figuras = useMemo(() => s.catalogo?.figuras || [], [s.catalogo?.figuras]);
    const pagination = useMemo(() => s.catalogo?.pagination || null, [s.catalogo?.pagination]);
    const loading = useMemo(() => s.loadings?.catalogo?.figuras, [s.loadings?.catalogo?.figuras]);
    const etiquetas = useMemo(() => s.catalogo?.etiquetas || [], [s.catalogo?.etiquetas]);

    const figuraActual = useMemo(() => s.catalogo?.figuraActual, [s.catalogo?.figuraActual]);
    const loadingDetail = useMemo(() => s.loadings?.catalogo?.figura, [s.loadings?.catalogo?.figura]);

    const [q, setQ] = createState(['galeria', 'q'], '');
    const [selectedTags, setSelectedTags] = createState(['galeria', 'selectedTags'], []);
    const [page, setPage] = createState(['galeria', 'page'], 1);
    const [orden, setOrdenRaw] = createState(['galeria', 'orden'], 'nombre_asc');
    const [filtersOpen, setFiltersOpen] = createState(['galeria', 'filtersOpen'], false);

    const toggleTag = useCallback((tagId) => {
        const next = selectedTags.includes(tagId)
            ? selectedTags.filter(t => t !== tagId)
            : [...selectedTags, tagId];
        setSelectedTags(next);
        setPage(1);
    }, [selectedTags]);

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
        setOrdenRaw('nombre_asc');
        setPage(1);
    }, []);

    const activeFiltersCount = useMemo(
        () => selectedTags.length + (orden !== 'nombre_asc' ? 1 : 0) + (q ? 1 : 0),
        [selectedTags, orden, q]
    );

    const openDetail = useCallback((figuraId) => {
        navigate(`/figura/${figuraId}`);
    }, [navigate]);

    const closeDetail = useCallback(() => {
        navigate('/');
    }, [navigate]);

    return {
        style, id, figuras, pagination, loading, etiquetas,
        figuraActual, loadingDetail,
        q, setQ: setQAndResetPage, selectedTags, toggleTag, page, setPage,
        orden, setOrden, filtersOpen, setFiltersOpen, activeFiltersCount, clearFilters,
        openDetail, closeDetail,
    };
};

export const localEffects = (ls) => {
    const { f } = useStates();

    useEffect(() => {
        f.u1('page', 'title', 'Catálogo');
        f.u1('sidebar', 'sideMode', undefined);
        f.catalogo.getEtiquetas();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => {
            f.catalogo.getFiguras({
                q: ls.q || undefined,
                etiquetas: ls.selectedTags.length ? ls.selectedTags.join(',') : undefined,
                orden: ls.orden || undefined,
                page: ls.page,
                limit: 24,
            });
        }, 300);
        return () => clearTimeout(t);
    }, [ls.q, ls.selectedTags, ls.orden, ls.page]);

    useEffect(() => {
        if (ls.id) {
            f.catalogo.getFigura(ls.id);
        }
    }, [ls.id]);
};
