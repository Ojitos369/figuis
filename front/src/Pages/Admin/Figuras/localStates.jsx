import { useEffect, useMemo, useCallback } from 'react';
import { useStates, createState } from '../../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();

    const figuras = useMemo(() => s.admin?.figuras || [], [s.admin?.figuras]);
    const pagination = useMemo(() => s.admin?.pagination || null, [s.admin?.pagination]);
    const loading = useMemo(() => s.loadings?.admin?.figuras, [s.loadings?.admin?.figuras]);
    const etiquetas = useMemo(() => s.catalogo?.etiquetas || [], [s.catalogo?.etiquetas]);

    const [q, setQ] = createState(['adminFiguras', 'q'], '');
    const [estatus, setEstatus] = createState(['adminFiguras', 'estatus'], '');
    const [selectedTags, setSelectedTags] = createState(['adminFiguras', 'selectedTags'], []);
    const [orden, setOrdenRaw] = createState(['adminFiguras', 'orden'], 'fecha_desc');
    const [desde, setDesde] = createState(['adminFiguras', 'desde'], '');
    const [hasta, setHasta] = createState(['adminFiguras', 'hasta'], '');
    const [page, setPage] = createState(['adminFiguras', 'page'], 1);
    const [filtersOpen, setFiltersOpen] = createState(['adminFiguras', 'filtersOpen'], false);
    const [showForm, setShowForm] = createState(['adminFiguras', 'showForm'], false);
    const [editId, setEditId] = createState(['adminFiguras', 'editId'], null);

    const openCreate = useCallback(() => {
        setEditId(null);
        setShowForm(true);
    }, []);

    const openEdit = useCallback((figura) => {
        setEditId(figura.id);
        setShowForm(true);
    }, []);

    const closeForm = useCallback(() => {
        setShowForm(false);
        setEditId(null);
    }, []);

    const reload = useCallback(() => {
        const params = { page, limit: 24 };
        if (q) params.q = q;
        if (estatus) params.estatus = estatus;
        if (selectedTags.length) params.etiquetas = selectedTags.join(',');
        if (orden) params.orden = orden;
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        f.admin.getFiguras(params);
    }, [f.admin, page, q, estatus, selectedTags, orden, desde, hasta]);

    const setQAndResetPage = useCallback((value) => {
        setQ(value);
        setPage(1);
    }, []);

    const setEstatusAndResetPage = useCallback((value) => {
        setEstatus(value);
        setPage(1);
    }, []);

    const setOrden = useCallback((value) => {
        setOrdenRaw(value);
        setPage(1);
    }, []);

    const toggleTag = useCallback((tagId) => {
        const next = selectedTags.includes(tagId)
            ? selectedTags.filter(t => t !== tagId)
            : [...selectedTags, tagId];
        setSelectedTags(next);
        setPage(1);
    }, [selectedTags]);

    const clearFilters = useCallback(() => {
        setQ('');
        setEstatus('');
        setSelectedTags([]);
        setOrdenRaw('fecha_desc');
        setDesde('');
        setHasta('');
        setPage(1);
    }, []);

    const activeFiltersCount = useMemo(
        () => selectedTags.length + (estatus ? 1 : 0) + (orden !== 'fecha_desc' ? 1 : 0) + (q ? 1 : 0) + (desde ? 1 : 0) + (hasta ? 1 : 0),
        [selectedTags, estatus, orden, q, desde, hasta]
    );

    const applyFilters = useCallback(() => {
        setPage(1);
        reload();
        setFiltersOpen(false);
    }, [reload]);

    const removeFigura = useCallback((figura) => {
        if (!window.confirm(`¿Eliminar "${figura.nombre}"? Esta acción no se puede deshacer.`)) return;
        f.admin.deleteFigura(figura.id, () => reload());
    }, [f.admin, reload]);

    return {
        style, figuras, pagination, loading, etiquetas,
        q, setQ: setQAndResetPage, estatus, setEstatus: setEstatusAndResetPage,
        selectedTags, toggleTag, orden, setOrden, desde, setDesde, hasta, setHasta,
        page, setPage, filtersOpen, setFiltersOpen, activeFiltersCount, clearFilters, applyFilters,
        showForm, editId, openCreate, openEdit, closeForm, reload, removeFigura,
    };
};

export const localEffects = (ls) => {
    const { f } = useStates();
    useEffect(() => {
        f.u1('page', 'title', 'Figuras');
        f.catalogo.getEtiquetas();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => ls.reload(), 350);
        return () => clearTimeout(t);
    }, [ls.q, ls.estatus, ls.selectedTags, ls.orden, ls.desde, ls.hasta, ls.page]);
};
