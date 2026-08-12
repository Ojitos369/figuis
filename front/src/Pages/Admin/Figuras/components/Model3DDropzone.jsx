import { useRef, useState, lazy, Suspense } from 'react';
import { mediaUrl } from '../../../../constants/api';
import style from '../styles/form.module.scss';

const STLViewer = lazy(() => import('../../../../Components/STLViewer').then(m => ({ default: m.STLViewer })));
const ACCEPT = '.stl';

// El archivo se guarda con nombre uuid (sin el nombre original), asi que solo
// mostramos la extension como referencia.
const labelFromUrl = (url) => {
    const ext = (url.split('.').pop() || '').toLowerCase();
    return ext ? `Modelo 3D (.${ext})` : 'Modelo 3D';
};

// Igual que MediaDropzone (click o drag&drop, multi-seleccion) pero para .stl,
// con un boton para previsualizar el modelo en 3D antes de guardarlo definitivo.
export const Model3DDropzone = ({ label, hint, items, onFiles, onDelete, uploading }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const dragDepth = useRef(0);
    const [previewUrl, setPreviewUrl] = useState(null);

    const openPicker = () => inputRef.current?.click();

    const onDragEnter = (e) => {
        e.preventDefault();
        if (!e.dataTransfer?.types?.includes('Files')) return;
        dragDepth.current += 1;
        setDragging(true);
    };
    const onDragOver = (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const files = e.dataTransfer?.files;
        if (files?.length) onFiles(files);
    };

    return (
        <div className={style.field}>
            <label>{label}</label>
            {!!hint && <p className={style.hint}>{hint}</p>}
            <div
                className={`${style.dropzone} ${dragging ? style.dropzoneActive : ''}`}
                onDragEnter={onDragEnter}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
            >
                <div className={style.modelList}>
                    {items.map(a => (
                        <div key={a.id} className={style.modelItem}>
                            <span className={style.modelIcon}>🧊</span>
                            <span className={style.modelName}>{labelFromUrl(a.archivo_url)}</span>
                            <button type="button" className={style.modelPreviewBtn} onClick={() => setPreviewUrl(a.archivo_url)}>
                                Ver 3D
                            </button>
                            <button type="button" className={style.modelRemove} onClick={() => onDelete(a)}>✕</button>
                        </div>
                    ))}
                    <button type="button" className={style.modelAddBtn} onClick={openPicker} disabled={uploading}>
                        <span>+</span> Subir .stl
                    </button>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPT}
                        multiple
                        hidden
                        onChange={e => { onFiles(e.target.files); e.target.value = ''; }}
                    />
                </div>
                {dragging && <div className={style.dropzoneHint}>Suelta el .stl aquí</div>}
            </div>

            {!!previewUrl && (
                <div className={style.model3dOverlay} onClick={() => setPreviewUrl(null)}>
                    <div className={style.model3dBox} onClick={e => e.stopPropagation()}>
                        <button type="button" className={style.model3dClose} onClick={() => setPreviewUrl(null)}>✕</button>
                        <Suspense fallback={<div className={style.modelPreviewLoading}>Cargando visor 3D...</div>}>
                            <STLViewer url={mediaUrl(previewUrl)} />
                        </Suspense>
                    </div>
                </div>
            )}
        </div>
    );
};
