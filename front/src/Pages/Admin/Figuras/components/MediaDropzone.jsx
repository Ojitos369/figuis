import { useRef, useState } from 'react';
import { MediaThumb } from '../../../../Components/MediaThumb';
import style from '../styles/form.module.scss';

const ACCEPT = 'image/*,video/*,audio/*';

// Zona de medios: click para elegir (multi-seleccion) o arrastrar y soltar archivos.
export const MediaDropzone = ({ label, hint, items, uploads = [], onFiles, onDelete, onReorder }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const dragDepth = useRef(0);
    const dragState = useRef(null); // { id, pointerId }
    const [draggingId, setDraggingId] = useState(null);
    const [overIdx, setOverIdx] = useState(null);

    const openPicker = () => inputRef.current?.click();

    // Pointer Events (no HTML5 DnD) para que funcione igual con mouse y touch,
    // y no dispare el menu nativo de imagen ni la zona de "soltar archivos".
    const hoveredIdxAt = (x, y) => {
        const el = document.elementFromPoint(x, y)?.closest('[data-media-idx]');
        return el ? Number(el.dataset.mediaIdx) : null;
    };
    const onItemPointerDown = (e, idx, id) => {
        if (!onReorder || (e.pointerType === 'mouse' && e.button !== 0) || e.target.closest('button')) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragState.current = { id, pointerId: e.pointerId };
        setDraggingId(id);
        setOverIdx(idx);
    };
    const onItemPointerMove = (e) => {
        if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
        e.preventDefault();
        setOverIdx(hoveredIdxAt(e.clientX, e.clientY));
    };
    const endDrag = (e) => {
        if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
        const from = items.findIndex(a => a.id === dragState.current.id);
        const to = hoveredIdxAt(e.clientX, e.clientY);
        dragState.current = null;
        setDraggingId(null);
        setOverIdx(null);
        if (from === -1 || to === null || from === to) return;
        const next = items.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        onReorder(next);
    };

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
                    {items.map((a, idx) => (
                        <div
                            key={a.id}
                            data-media-idx={idx}
                            className={[
                                style.mediaItem,
                                style.mediaItemIn,
                                draggingId === a.id ? style.mediaItemDragging : '',
                                draggingId && draggingId !== a.id && overIdx === idx ? style.mediaItemOver : '',
                            ].filter(Boolean).join(' ')}
                            onPointerDown={e => onItemPointerDown(e, idx, a.id)}
                            onPointerMove={onItemPointerMove}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                        >
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
