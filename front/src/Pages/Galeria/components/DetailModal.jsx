import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useStates } from '../../../Hooks/useStates';
import { SheetModal } from '../../../Components/SheetModal';
import { Tag } from '../../../Components/Tag';
import { Loader } from '../../../Components/Loader';
import { MediaThumb } from '../../../Components/MediaThumb';
import { MediaViewer } from '../../../Components/MediaViewer';
import { ReactionBar } from '../../../Components/ReactionBar';
import { ErrorBoundary } from '../../../Components/ErrorBoundary';
import { LINK_API_PORT, mediaUrl } from '../../../constants/api';

const SWIPE_THRESHOLD = 40;

// three.js + fiber/drei pesan bastante: solo se descargan si el usuario
// realmente activa la previsualizacion 3D.
const STLViewer = lazy(() => import('../../../Components/STLViewer').then(m => ({ default: m.STLViewer })));

const DownloadIcon = ({ all = false }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2" />
        {all && <path d="M4 6h16" />}
    </svg>
);

const fileNameFromPath = (path, fallback) => {
    const cleanPath = String(path || '').split('?')[0];
    return decodeURIComponent(cleanPath.split('/').pop() || fallback);
};

export const DetailModal = ({ ls }) => {
    const { f } = useStates();
    const { style, id, figuraActual, loadingDetail, closeDetail } = ls;
    const [activeIdx, setActiveIdx] = useState(0);
    const [show3D, setShow3D] = useState(false);
    const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
    const [downloadingMultiple, setDownloadingMultiple] = useState(false);

    const open = !!id;
    const notFound = open && figuraActual === false;
    const data = open && figuraActual ? figuraActual : null;
    const gallery = data ? [...(data.resultado || []), ...(data.relacionados || [])] : [];
    const modelo3d = data?.modelos_3d?.[0];
    const canNav = !show3D && gallery.length > 1;
    const activeMedia = gallery[activeIdx];

    useEffect(() => {
        setActiveIdx(0);
        setShow3D(false);
        setDownloadMenuOpen(false);
        setDownloadingMultiple(false);
    }, [id]);

    const goPrev = useCallback(() => {
        setActiveIdx(i => (i - 1 + gallery.length) % gallery.length);
    }, [gallery.length]);
    const goNext = useCallback(() => {
        setActiveIdx(i => (i + 1) % gallery.length);
    }, [gallery.length]);

    // Flechas del teclado, solo mientras se ve la galeria de fotos (no en 3D,
    // donde arrastrar es rotar el modelo).
    useEffect(() => {
        if (!open || !canNav) return;
        const onKey = (e) => {
            if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, canNav, goPrev, goNext]);

    // Deslizar con dedo/mouse sobre el visor principal.
    const swipeRef = useRef({ startX: 0, dragging: false });
    const onSwipeStart = (e) => {
        if (!canNav) return;
        swipeRef.current = { startX: e.clientX, dragging: true };
    };
    const onSwipeEnd = (e) => {
        if (!canNav || !swipeRef.current.dragging) return;
        swipeRef.current.dragging = false;
        const dx = e.clientX - swipeRef.current.startX;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        if (dx > 0) goPrev(); else goNext();
    };

    const share = () => {
        // ruta "real" (sin #) para que el crawler de WhatsApp/redes lea los
        // meta og:image/og:title del back antes de redirigir al SPA.
        const url = `${window.location.origin}/figura/${id}`;
        if (navigator.share) {
            navigator.share({ title: data?.nombre, url }).catch(() => {});
            return;
        }
        navigator.clipboard?.writeText(url).then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Enlace copiado al portapapeles', mode: 'success' });
        });
    };

    const copyCodigo = () => {
        if (!data?.codigo) return;
        navigator.clipboard?.writeText(data.codigo).then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Código copiado al portapapeles', mode: 'success' });
        });
    };

    const downloadMultiple = () => {
        if (downloadingMultiple) return;
        setDownloadMenuOpen(false);
        setDownloadingMultiple(true);

        gallery.forEach((archivo, index) => {
            window.setTimeout(() => {
                const link = document.createElement('a');
                link.href = mediaUrl(archivo.archivo_url);
                link.download = fileNameFromPath(archivo.archivo_url, `media-${index + 1}`);
                document.body.appendChild(link);
                link.click();
                link.remove();

                if (index === gallery.length - 1) setDownloadingMultiple(false);
            }, index * 150);
        });
    };

    return (
        <SheetModal open={open} onClose={closeDetail} title={data?.nombre || (notFound ? 'No encontrada' : 'Cargando...')} maxWidth="640px">
            {loadingDetail && !data && (
                <div className={style.detailLoader}><Loader label="Cargando..." /></div>
            )}

            {notFound && (
                <div className={style.detailEmpty}>Esta figura no existe o ya no está disponible.</div>
            )}

            {!!data && (
                <div className={style.detailBody}>
                    {show3D && modelo3d ? (
                        <div className={style.mainViewer}>
                            <ErrorBoundary fallback={<div className={style.detailLoader}>⚠️ No se pudo cargar el visor 3D.</div>}>
                                <Suspense fallback={<div className={style.detailLoader}><Loader label="Cargando visor 3D..." /></div>}>
                                    <STLViewer url={mediaUrl(modelo3d.archivo_url)} />
                                </Suspense>
                            </ErrorBoundary>
                        </div>
                    ) : !!gallery.length && (
                        <>
                            <div
                                className={style.mainViewer}
                                onPointerDown={onSwipeStart}
                                onPointerUp={onSwipeEnd}
                                onPointerCancel={() => { swipeRef.current.dragging = false; }}
                            >
                                <MediaViewer url={gallery[activeIdx]?.archivo_url} alt={data.nombre} />
                                {canNav && (
                                    <>
                                        <button type="button" className={`${style.navBtn} ${style.navBtnPrev}`} onClick={goPrev} aria-label="Anterior">‹</button>
                                        <button type="button" className={`${style.navBtn} ${style.navBtnNext}`} onClick={goNext} aria-label="Siguiente">›</button>
                                        <span className={style.navCounter}>{activeIdx + 1} / {gallery.length}</span>
                                    </>
                                )}
                            </div>
                            {gallery.length > 1 && (
                                <div className={style.thumbStrip}>
                                    {gallery.map((a, i) => (
                                        <button
                                            key={a.id}
                                            type="button"
                                            className={`${style.thumbBtn} ${i === activeIdx ? style.thumbActive : ''}`}
                                            onClick={() => setActiveIdx(i)}
                                        >
                                            <MediaThumb url={a.archivo_url} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {!!modelo3d && (
                        <button type="button" className={style.view3dBtn} onClick={() => setShow3D(v => !v)}>
                            {show3D ? '🖼 Ver fotos' : '🧊 Previsualizar en 3D'}
                        </button>
                    )}

                    {!!activeMedia && (
                        <div className={style.downloadActions}>
                            <a
                                className={style.downloadBtn}
                                href={mediaUrl(activeMedia.archivo_url)}
                                download={fileNameFromPath(activeMedia.archivo_url, 'media')}
                                title="Descargar archivo actual"
                                aria-label="Descargar archivo actual"
                            >
                                <DownloadIcon />
                            </a>
                            <div className={style.downloadMenuWrap}>
                                <button
                                    type="button"
                                    className={style.downloadBtn}
                                    onClick={() => setDownloadMenuOpen(value => !value)}
                                    title="Descargar todos los archivos del álbum"
                                    aria-label="Descargar todos los archivos del álbum"
                                    aria-expanded={downloadMenuOpen}
                                >
                                    <DownloadIcon all />
                                </button>
                                {downloadMenuOpen && (
                                    <div className={style.downloadMenu}>
                                        <a
                                            href={`${LINK_API_PORT}/api/catalogo/figura/descargar?id=${encodeURIComponent(data.id)}`}
                                            onClick={() => setDownloadMenuOpen(false)}
                                        >
                                            Descargar todos con ZIP
                                        </a>
                                        <button
                                            type="button"
                                            onClick={downloadMultiple}
                                            disabled={downloadingMultiple}
                                        >
                                            {downloadingMultiple ? 'Descargando...' : 'Descargar todos individualmente'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!!data.etiquetas?.length && (
                        <div className={style.detailTags}>
                            {data.etiquetas.map(e => (
                                <Tag key={e.id} nombre={e.nombre} color={e.color} />
                            ))}
                        </div>
                    )}

                    {!!data.descripcion && (
                        <p className={style.detailDesc}>{data.descripcion}</p>
                    )}

                    <ReactionBar figuraId={data.id} reacciones={data.reacciones} misReacciones={data.mis_reacciones} />

                    <div className={style.actionsRow}>
                        <button type="button" className={style.shareBtn} onClick={share}>
                            🔗 Compartir
                        </button>
                        {!!data.codigo && (
                            <button type="button" className={style.shareBtn} onClick={copyCodigo}>
                                📋 Copiar código
                            </button>
                        )}
                    </div>

                    {!!data.codigo && (
                        <div className={style.detailCodigo}>Código: #{data.codigo}</div>
                    )}
                </div>
            )}
        </SheetModal>
    );
};
