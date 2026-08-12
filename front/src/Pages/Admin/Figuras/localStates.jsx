import { useEffect, useMemo, useCallback } from 'react';
import { useStates, createState } from '../../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();

    const figuras = useMemo(() => s.admin?.figuras || [], [s.admin?.figuras]);
    const pagination = useMemo(() => s.admin?.pagination || null, [s.admin?.pagination]);
    const loading = useMemo(() => s.loadings?.admin?.figuras, [s.loadings?.admin?.figuras]);

    const [q, setQ] = createState(['adminFiguras', 'q'], '');
    const [estatus, setEstatus] = createState(['adminFiguras', 'estatus'], '');
    const [page, setPage] = createState(['adminFiguras', 'page'], 1);
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
        f.admin.getFiguras(params);
    }, [f.admin, page, q, estatus]);

    const setQAndResetPage = useCallback((value) => {
        setQ(value);
        setPage(1);
    }, []);

    const setEstatusAndResetPage = useCallback((value) => {
        setEstatus(value);
        setPage(1);
    }, []);

    const removeFigura = useCallback((figura) => {
        if (!window.confirm(`¿Eliminar "${figura.nombre}"? Esta acción no se puede deshacer.`)) return;
        f.admin.deleteFigura(figura.id, () => reload());
    }, [f.admin, reload]);

    return {
        style, figuras, pagination, loading,
        q, setQ: setQAndResetPage, estatus, setEstatus: setEstatusAndResetPage, page, setPage,
        showForm, editId, openCreate, openEdit, closeForm, reload, removeFigura,
    };
};

export const localEffects = (ls) => {
    const { f } = useStates();
    useEffect(() => {
        f.u1('page', 'title', 'Figuras');
    }, []);

    useEffect(() => {
        const t = setTimeout(() => ls.reload(), 350);
        return () => clearTimeout(t);
    }, [ls.q, ls.estatus, ls.page]);
};
