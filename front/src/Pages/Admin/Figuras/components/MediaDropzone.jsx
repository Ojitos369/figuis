import { useRef, useState } from 'react';
import { MediaThumb } from '../../../../Components/MediaThumb';
import style from '../styles/form.module.scss';

const ACCEPT = 'image/*,video/*,audio/*';

// Zona de medios: click para elegir (multi-seleccion) o arrastrar y soltar archivos.
export const MediaDropzone = ({ label, hint, items, uploads = [], onFiles, onDelete }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const dragDepth = useRef(0);

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
                <div className={style.mediaGrid}>
                    {items.map(a => (
                        <div key={a.id} className={`${style.mediaItem} ${style.mediaItemIn}`}>
                            <MediaThumb url={a.archivo_url} />
                            <button type="button" className={style.mediaRemove} onClick={() => onDelete(a)}>✕</button>
                        </div>
                    ))}
                    {uploads.map(u => (
                        <div key={u.tempId} className={style.mediaUploading} title={u.name}>
                            <span
                                className={style.progressRing}
                                style={{ '--progress': `${u.progress}%` }}
                            >
                                <span className={style.progressPct}>{u.progress}%</span>
                            </span>
                        </div>
                    ))}
                    <button type="button" className={style.mediaAdd} onClick={openPicker}>
                        <span>+</span> Agregar
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
                {dragging && <div className={style.dropzoneHint}>Suelta los archivos aquí</div>}
            </div>
        </div>
    );
};
