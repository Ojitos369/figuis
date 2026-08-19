import { useEffect, useState } from 'react';
import { SheetModal } from '../../../Components/SheetModal';
import { MediaThumb } from '../../../Components/MediaThumb';
import { LINK_API_PORT, mediaUrl } from '../../../constants/api';
import style from '../styles/index.module.scss';

const fileNameFromPath = (path, fallback) => {
    const cleanPath = String(path || '').split('?')[0];
    return decodeURIComponent(cleanPath.split('/').pop() || fallback);
};

// Selector de archivos a descargar (estilo "seleccionar varios" de TikTok):
// todo viene preseleccionado y el usuario quita lo que no quiere antes de bajar.
export const DownloadSelectSheet = ({ open, onClose, figuraId, items }) => {
    const [selected, setSelected] = useState(() => new Set(items.map(i => i.id)));
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (open) setSelected(new Set(items.map(i => i.id)));
    }, [open, items]);

    if (!open) return null;

    const selectedItems = items.filter(i => selected.has(i.id));
    const allSelected = selected.size === items.length;
    const noneSelected = selected.size === 0;

    const toggle = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(items.map(i => i.id)));
    const selectNone = () => setSelected(new Set());
    const invertSelection = () => setSelected(prev => new Set(items.filter(i => !prev.has(i.id)).map(i => i.id)));

    const downloadZip = () => {
        if (noneSelected) return;
        const params = new URLSearchParams({ id: figuraId, archivos: selectedItems.map(i => i.id).join(',') });
        const link = document.createElement('a');
        link.href = `${LINK_API_PORT}/api/catalogo/figura/descargar?${params.toString()}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        onClose();
    };

    const downloadIndividually = () => {
        if (noneSelected || downloading) return;
        setDownloading(true);
        selectedItems.forEach((archivo, index) => {
            window.setTimeout(() => {
                const link = document.createElement('a');
                link.href = mediaUrl(archivo.archivo_url);
                link.download = fileNameFromPath(archivo.archivo_url, `media-${index + 1}`);
                document.body.appendChild(link);
                link.click();
                link.remove();

                if (index === selectedItems.length - 1) {
                    setDownloading(false);
                    onClose();
                }
            }, index * 150);
        });
    };

    return (
        <SheetModal
            open={open}
            onClose={onClose}
            title="Elegir archivos a descargar"
            maxWidth="560px"
            footer={(
                <div className={style.selectFooter}>
                    <span className={style.selectCount}>{selected.size} de {items.length} seleccionados</span>
                    <div className={style.selectFooterBtns}>
                        <button type="button" onClick={downloadIndividually} disabled={noneSelected || downloading}>
                            {downloading ? 'Descargando...' : 'Descargar individual'}
                        </button>
                        <button type="button" className={style.selectFooterPrimary} onClick={downloadZip} disabled={noneSelected}>
                            Descargar ZIP
                        </button>
                    </div>
                </div>
            )}
        >
            <div className={style.selectToolbar}>
                <button type="button" onClick={selectAll} disabled={allSelected}>Seleccionar todos</button>
                <button type="button" onClick={selectNone} disabled={noneSelected}>Quitar selección</button>
                <button type="button" onClick={invertSelection}>Invertir selección</button>
            </div>
            <div className={style.selectGrid}>
                {items.map(item => {
                    const checked = selected.has(item.id);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`${style.selectItem} ${checked ? style.selectItemChecked : ''}`}
                            onClick={() => toggle(item.id)}
                            aria-pressed={checked}
                        >
                            <MediaThumb url={item.archivo_url} />
                            <span className={style.selectCheck}>{checked && '✓'}</span>
                        </button>
                    );
                })}
            </div>
        </SheetModal>
    );
};
