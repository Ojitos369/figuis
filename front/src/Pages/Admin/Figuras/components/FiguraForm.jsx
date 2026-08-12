import { useEffect, useState } from 'react';
import { useStates } from '../../../../Hooks/useStates';
import { SheetModal } from '../../../../Components/SheetModal';
import { MediaDropzone } from './MediaDropzone';
import { Model3DDropzone } from './Model3DDropzone';
import { TagInput } from './TagInput';
import style from '../styles/form.module.scss';

const emptyForm = { nombre: '', descripcion: '', estatus: 'borrador', etiquetas: [] };
const emptyArchivos = { resultado: [], relacionado: [], modelo_3d: [] };

export const FiguraForm = ({ open, figuraId, onClose, onSaved }) => {
    const { s, f } = useStates();
    const saving = s.loadings?.admin?.saveFigura;

    const [currentId, setCurrentId] = useState(figuraId || null);
    const [form, setForm] = useState(emptyForm);
    const [archivos, setArchivos] = useState(emptyArchivos);
    const [uploads, setUploads] = useState({ resultado: [], relacionado: [], modelo_3d: [] });

    useEffect(() => {
        if (!open) return;
        f.catalogo.getEtiquetas();
        setCurrentId(figuraId || null);
        if (figuraId) {
            f.admin.getFigura(figuraId, (data) => {
                if (!data) return;
                setForm({
                    nombre: data.nombre || '',
                    descripcion: data.descripcion || '',
                    estatus: data.estatus || 'borrador',
                    etiquetas: data.etiquetas || [],
                });
                setArchivos({
                    resultado: data.resultado || [],
                    relacionado: data.relacionados || [],
                    modelo_3d: data.modelos_3d || [],
                });
            });
        } else {
            setForm(emptyForm);
            setArchivos(emptyArchivos);
        }
    }, [open, figuraId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) return;
        const payload = { ...form, etiquetas_ids: form.etiquetas.map(t => t.id) };
        delete payload.etiquetas;
        f.admin.saveFigura({ id: currentId, ...payload }, (res) => {
            if (!res?.id) return;
            if (!currentId) {
                setCurrentId(res.id);
                f.admin.getFigura(res.id, (data) => {
                    setArchivos({
                        resultado: data?.resultado || [],
                        relacionado: data?.relacionados || [],
                        modelo_3d: data?.modelos_3d || [],
                    });
                });
            }
            onSaved?.();
        });
    };

    const handleFiles = (fileList, tipo) => {
        if (!currentId || !fileList?.length) return;
        const files = Array.from(fileList);
        const entries = files.map(file => ({
            tempId: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: file.name,
            progress: 0,
        }));
        setUploads(prev => ({ ...prev, [tipo]: [...prev[tipo], ...entries] }));

        files.forEach((file, i) => {
            const { tempId } = entries[i];
            f.admin.saveFiguraArchivo(
                { figura_id: currentId, tipo, file },
                (res) => {
                    setUploads(prev => ({ ...prev, [tipo]: prev[tipo].filter(u => u.tempId !== tempId) }));
                    if (res) {
                        const nuevo = { id: res.id, archivo_url: res.url, tipo: res.tipo };
                        setArchivos(prev => ({ ...prev, [tipo]: [...prev[tipo], nuevo] }));
                    }
                },
                (progress) => {
                    setUploads(prev => ({
                        ...prev,
                        [tipo]: prev[tipo].map(u => u.tempId === tempId ? { ...u, progress } : u),
                    }));
                }
            );
        });
    };

    const handleDeleteArchivo = (archivo, tipo) => {
        f.admin.deleteFiguraArchivo(archivo.id, () => {
            setArchivos(prev => ({ ...prev, [tipo]: prev[tipo].filter(a => a.id !== archivo.id) }));
        });
    };

    const isEditing = !!currentId;

    return (
        <SheetModal open={open} onClose={onClose} title={isEditing ? (figuraId ? 'Editar figura' : 'Nueva figura') : 'Nueva figura'} maxWidth="640px">
            <form className={style.form} onSubmit={handleSubmit}>
                <div className={style.field}>
                    <label>Nombre</label>
                    <input
                        type="text"
                        placeholder="Nombre de la figura"
                        value={form.nombre}
                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                        autoFocus
                    />
                </div>

                <div className={style.field}>
                    <label>Descripción</label>
                    <textarea
                        rows={3}
                        placeholder="Detalles, materiales, notas..."
                        value={form.descripcion}
                        onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    />
                </div>

                <div className={style.field}>
                    <label>Estatus</label>
                    <div className={style.statusToggle}>
                        <button type="button"
                            className={`${style.statusBtn} ${form.estatus === 'borrador' ? style.statusActive : ''}`}
                            onClick={() => setForm({ ...form, estatus: 'borrador' })}>
                            Borrador
                        </button>
                        <button type="button"
                            className={`${style.statusBtn} ${style.statusPublic} ${form.estatus === 'publico' ? style.statusActive : ''}`}
                            onClick={() => setForm({ ...form, estatus: 'publico' })}>
                            Público
                        </button>
                    </div>
                </div>

                <div className={style.field}>
                    <label>Etiquetas</label>
                    <TagInput
                        tags={form.etiquetas}
                        onChange={(etiquetas) => setForm(prev => ({ ...prev, etiquetas }))}
                    />
                </div>

                <button type="submit" className={style.saveBtn} disabled={saving || !form.nombre.trim()}>
                    {saving ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear figura y continuar')}
                </button>

                {isEditing && (
                    <>
                        <div className={style.divider} />

                        <MediaDropzone
                            label="Resultado (portada)"
                            hint="La figura terminada. La primera imagen es la portada del catálogo."
                            items={archivos.resultado}
                            uploads={uploads.resultado}
                            onFiles={(files) => handleFiles(files, 'resultado')}
                            onDelete={(a) => handleDeleteArchivo(a, 'resultado')}
                        />

                        <MediaDropzone
                            label="Archivos relacionados"
                            hint="Fotos de referencia usadas para generar la figura."
                            items={archivos.relacionado}
                            uploads={uploads.relacionado}
                            onFiles={(files) => handleFiles(files, 'relacionado')}
                            onDelete={(a) => handleDeleteArchivo(a, 'relacionado')}
                        />

                        <Model3DDropzone
                            label="Modelo 3D"
                            hint="Archivo .stl imprimible, con previsualización interactiva."
                            items={archivos.modelo_3d}
                            uploads={uploads.modelo_3d}
                            onFiles={(files) => handleFiles(files, 'modelo_3d')}
                            onDelete={(a) => handleDeleteArchivo(a, 'modelo_3d')}
                        />
                    </>
                )}
            </form>
        </SheetModal>
    );
};
