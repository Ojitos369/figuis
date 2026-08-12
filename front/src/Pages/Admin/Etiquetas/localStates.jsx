import { useEffect, useMemo, useCallback } from 'react';
import { useStates, createState } from '../../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s, f } = useStates();
    const etiquetas = useMemo(() => s.catalogo?.etiquetas || [], [s.catalogo?.etiquetas]);
    const saving = useMemo(() => s.loadings?.admin?.saveEtiqueta, [s.loadings?.admin?.saveEtiqueta]);

    const [editId, setEditId] = createState(['adminEtiquetas', 'editId'], null);
    const [nombre, setNombre] = createState(['adminEtiquetas', 'nombre'], '');
    const [color, setColor] = createState(['adminEtiquetas', 'color'], '#6366f1');

    const reload = useCallback(() => {
        f.catalogo.getEtiquetas();
    }, [f.catalogo]);

    const startCreate = useCallback(() => {
        setEditId(null);
        setNombre('');
        setColor('#6366f1');
    }, []);

    const startEdit = useCallback((etiqueta) => {
        setEditId(etiqueta.id);
        setNombre(etiqueta.nombre);
        setColor(etiqueta.color);
    }, []);

    const submit = useCallback((e) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        f.admin.saveEtiqueta({ id: editId, nombre: nombre.trim(), color }, () => {
            startCreate();
            reload();
        });
    }, [f.admin, editId, nombre, color, reload, startCreate]);

    const remove = useCallback((etiqueta) => {
        if (!window.confirm(`¿Eliminar la etiqueta "${etiqueta.nombre}"?`)) return;
        f.admin.deleteEtiqueta(etiqueta.id, () => {
            if (editId === etiqueta.id) startCreate();
            reload();
        });
    }, [f.admin, editId, reload, startCreate]);

    return { style, etiquetas, saving, editId, nombre, setNombre, color, setColor, startCreate, startEdit, submit, remove, reload };
};

export const localEffects = (ls) => {
    const { f } = useStates();
    useEffect(() => {
        f.u1('page', 'title', 'Etiquetas');
        ls.reload();
    }, []);
};
