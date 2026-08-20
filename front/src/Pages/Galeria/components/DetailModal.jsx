import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { useStates } from '../../../Hooks/useStates';
import { SheetModal } from '../../../Components/SheetModal';
import { Tag } from '../../../Components/Tag';
import { Loader } from '../../../Components/Loader';
import { MediaThumb } from '../../../Components/MediaThumb';
import { MediaViewer } from '../../../Components/MediaViewer';
import { ReactionBar } from '../../../Components/ReactionBar';
import { ErrorBoundary } from '../../../Components/ErrorBoundary';
import { Copy } from '../../../Components/Icons';
import { DownloadSelectSheet } from './DownloadSelectSheet';
import { mediaUrl } from '../../../constants/api';
import facebookIcon from '../../../assets/social/facebook.svg';
import instagramIcon from '../../../assets/social/instagram.svg';
import whatsappIcon from '../../../assets/social/whatsapp.svg';
import { getCanonicalFiguraIdentifier, getFiguraPath, isFiguraIdentifierFor } from '../figuraUrl';

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

const SocialIcon = ({ src, className }) => (
    <img className={className} src={src} alt="" aria-hidden="true" />
);

const fileNameFromPath = (path, fallback) => {
    const cleanPath = String(path || '').split('?')[0];
    return decodeURIComponent(cleanPath.split('/').pop() || fallback);
};

export const DetailModal = ({ ls }) => {
    const { s, f } = useStates();
    const { style, identifier, figuraActual, loadingDetail, closeDetail, getTagHref } = ls;
    const [activeIdx, setActiveIdx] = useState(0);
    const [show3D, setShow3D] = useState(false);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);
    const [selectSheetOpen, setSelectSheetOpen] = useState(false);

    const open = !!identifier;
    const isLogged = s.auth?.logged === true;
    const notFound = open && figuraActual === false;
    const data = open && figuraActual && isFiguraIdentifierFor(identifier, figuraActual)
        ? figuraActual
        : null;
    const gallery = data ? [...(data.resultado || []), ...(data.relacionados || [])] : [];
    const modelo3d = data?.modelos_3d?.[0];
    const canNav = !show3D && gallery.length > 1;
    const activeMedia = gallery[activeIdx];

    useEffect(() => {
        setActiveIdx(0);
        setShow3D(false);
        setShareMenuOpen(false);
        setSelectSheetOpen(false);
    }, [identifier]);

    useEffect(() => {
        if (!shareMenuOpen) return;
        const closeOnEscape = (event) => {
            if (event.key !== 'Escape') return;
            event.stopImmediatePropagation();
            setShareMenuOpen(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [shareMenuOpen]);

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

    const getShareData = () => {
        const canonicalIdentifier = getCanonicalFiguraIdentifier(data, identifier);
        const version = data?.updated_at ? `?v=${encodeURIComponent(data.updated_at)}` : '';
        const url = `${window.location.origin}${getFiguraPath(canonicalIdentifier)}${version}`;
        const text = `${data?.nombre || ''}\nCodigo: ${data?.codigo || ''}\n${url}`;
        return { text, url };
    };

    const copyShareText = () => {
        if (!data) return;
        const { text } = getShareData();
        navigator.clipboard?.writeText(text)?.then(() => {
            setShareMenuOpen(false);
            f.general.notificacion({ title: 'Listo', message: 'Texto copiado al portapapeles', mode: 'success' });
        });
    };

    const openShareUrl = (shareUrl) => {
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
        setShareMenuOpen(false);
    };

    const shareNative = async (fallbackUrl) => {
        if (!data) return;
        if (!navigator.share) {
            openShareUrl(fallbackUrl);
            return;
        }
        const { text, url } = getShareData();
        try {
            await navigator.share({ title: data.nombre, text, url });
            setShareMenuOpen(false);
        } catch (error) {
            if (error.name !== 'AbortError') {
                f.general.notificacion({ title: 'No disponible', message: 'No se pudo abrir el menú de compartir', mode: 'danger' });
            }
        }
    };

    const share = () => {
        setShareMenuOpen(value => !value);
    };

    const copyCodigo = () => {
        if (!data?.codigo) return;
        navigator.clipboard?.writeText(data.codigo).then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Código copiado al portapapeles', mode: 'success' });
        });
    };

    const copyText = (text, label) => {
        if (!text) return;
        navigator.clipboard?.writeText(text)?.then(() => {
            f.general.notificacion({ title: 'Listo', message: `${label} copiado al portapapeles`, mode: 'success' });
        });
    };

    const copyMetadata = () => {
        if (!isLogged || !data) return;

        const tags = (data.etiquetas || [])
            .map(tag => String(tag.nombre || '').trim().replace(/\s+/g, ''))
            .filter(Boolean)
            .map(tag => `#${tag}`)
            .join(' ');
        const hashtags = [tags, '#figures', '#3dprinting', '#3dfigures'].filter(Boolean).join(' ');
        const canonicalIdentifier = getCanonicalFiguraIdentifier(data, identifier);
        const url = `${window.location.origin}${getFiguraPath(canonicalIdentifier)}`;
        const metadata = `${data.nombre || ''}\n${hashtags}\n\nCodigo: ${data.codigo || ''}\n${url}`;

        navigator.clipboard?.writeText(metadata)?.then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Metadata copiada al portapapeles', mode: 'success' });
        });
    };

    const openSelectSheet = () => {
        setSelectSheetOpen(true);
    };

    const modalTitle = data ? (
        <span className={style.detailTitleWrap}>
            <span className={style.detailTitleText}>{data.nombre}</span>
            <button type="button" className={style.copyIconBtn} onClick={() => copyText(data.nombre, 'Título')} title="Copiar título" aria-label="Copiar título">
                <Copy size={16} />
            </button>
        </span>
    ) : (notFound ? 'No encontrada' : 'Cargando...');

    return (
        <SheetModal open={open} onClose={closeDetail} title={modalTitle} maxWidth="640px">
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
                            <button
                                type="button"
                                className={style.downloadBtn}
                                onClick={openSelectSheet}
                                title="Elegir y descargar archivos del álbum"
                                aria-label="Elegir y descargar archivos del álbum"
                            >
                                <DownloadIcon all />
                            </button>
                        </div>
                    )}

                    {!!data.etiquetas?.length && (
                        <div className={style.detailTags}>
                            {data.etiquetas.map(e => (
                                <Tag
                                    key={e.id}
                                    nombre={e.nombre}
                                    color={e.color}
                                    to={getTagHref(e)}
                                    ariaLabel={`Ver colecciones con la etiqueta ${e.nombre}`}
                                />
                            ))}
                        </div>
                    )}

                    {!!data.descripcion && (
                        <div className={style.detailDescWrap}>
                            <p className={style.detailDesc}>{data.descripcion}</p>
                            <button type="button" className={style.copyIconBtn} onClick={() => copyText(data.descripcion, 'Descripción')} title="Copiar descripción" aria-label="Copiar descripción">
                                <Copy size={16} />
                            </button>
                        </div>
                    )}

                    <ReactionBar figuraId={data.id} reacciones={data.reacciones} misReacciones={data.mis_reacciones} />

                    <div className={style.actionsRow}>
                        <div className={style.shareMenuWrap}>
                            <button type="button" className={style.shareBtn} onClick={share} aria-expanded={shareMenuOpen}>
                                🔗 Compartir
                            </button>
                            {shareMenuOpen && (
                                <div className={style.shareOverlay} onClick={() => setShareMenuOpen(false)}>
                                    <div className={style.shareSheet} role="dialog" aria-modal="true" aria-label="Compartir" onClick={event => event.stopPropagation()}>
                                        <div className={style.shareGrabber} />
                                        <div className={style.shareSheetHeader}>
                                            <h2>Compartir</h2>
                                            <button type="button" onClick={() => setShareMenuOpen(false)} aria-label="Cerrar">✕</button>
                                        </div>
                                        <div className={style.shareMenu}>
                                            <button type="button" onClick={copyShareText}>
                                                <span className={`${style.socialLogo} ${style.copyLogo}`} aria-hidden="true">📋</span>
                                                Copiar texto
                                            </button>
                                            <button type="button" onClick={() => {
                                                const { text } = getShareData();
                                                openShareUrl(`https://wa.me/?text=${encodeURIComponent(text)}`);
                                            }}>
                                                <SocialIcon src={whatsappIcon} className={style.socialLogo} />
                                                WhatsApp
                                            </button>
                                            <button type="button" onClick={() => {
                                                const { url, text } = getShareData();
                                                openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`);
                                            }}>
                                                <SocialIcon src={facebookIcon} className={style.socialLogo} />
                                                Facebook
                                            </button>
                                            <button type="button" onClick={() => shareNative('https://www.instagram.com/')}>
                                                <SocialIcon src={instagramIcon} className={style.socialLogo} />
                                                Instagram
                                            </button>
                                            <button type="button" onClick={() => {
                                                const { text } = getShareData();
                                                openShareUrl(`whatsapp://send?text=${encodeURIComponent(text)}`);
                                            }}>
                                                <SocialIcon src={whatsappIcon} className={style.socialLogo} />
                                                Historia de WhatsApp
                                            </button>
                                            <button type="button" onClick={() => shareNative('https://www.facebook.com/')}>
                                                <SocialIcon src={facebookIcon} className={style.socialLogo} />
                                                Historia de Facebook
                                            </button>
                                            <button type="button" onClick={() => shareNative('https://www.instagram.com/')}>
                                                <SocialIcon src={instagramIcon} className={style.socialLogo} />
                                                Historia de Instagram
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!!data.codigo && (
                            <button type="button" className={style.shareBtn} onClick={copyCodigo}>
                                📋 Copiar código
                            </button>
                        )}
                        {isLogged && (
                            <button type="button" className={style.shareBtn} onClick={copyMetadata}>
                                📋 Copiar metadata
                            </button>
                        )}
                    </div>

                    {!!data.codigo && (
                        <div className={style.detailCodigo}>Código: #{data.codigo}</div>
                    )}

                    <DownloadSelectSheet
                        open={selectSheetOpen}
                        onClose={() => setSelectSheetOpen(false)}
                        figuraId={data.id}
                        items={gallery}
                    />
                </div>
            )}
        </SheetModal>
    );
};
