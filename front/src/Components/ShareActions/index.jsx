import { useEffect, useState } from 'react';
import { useStates } from '../../Hooks/useStates';
import facebookIcon from '../../assets/social/facebook.svg';
import instagramIcon from '../../assets/social/instagram.svg';
import whatsappIcon from '../../assets/social/whatsapp.svg';
import { getCanonicalFiguraIdentifier, getFiguraPath } from '../../Pages/Galeria/figuraUrl';
import style from './styles/index.module.scss';

const SocialIcon = ({ src }) => (
    <img className={style.socialLogo} src={src} alt="" aria-hidden="true" />
);

// Botones de compartir/copiar codigo/copiar metadata de una figura, compartidos
// entre el detalle publico y la pantalla de edicion (misma logica, un solo lugar).
export const ShareActions = ({ figura, identifier = '', isLogged = false, buttonClassName = '' }) => {
    const { f } = useStates();
    const [shareMenuOpen, setShareMenuOpen] = useState(false);

    useEffect(() => {
        setShareMenuOpen(false);
    }, [figura?.id]);

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

    if (!figura) return null;

    const getShareData = () => {
        const canonicalIdentifier = getCanonicalFiguraIdentifier(figura, identifier);
        const url = `${window.location.origin}${getFiguraPath(canonicalIdentifier)}`;
        const text = `${figura?.nombre || ''}\nCodigo: ${figura?.codigo || ''}\n${url}`;
        return { text, url };
    };

    const copyShareText = () => {
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
        if (!navigator.share) {
            openShareUrl(fallbackUrl);
            return;
        }
        const { text, url } = getShareData();
        try {
            await navigator.share({ title: figura.nombre, text, url });
            setShareMenuOpen(false);
        } catch (error) {
            if (error.name !== 'AbortError') {
                f.general.notificacion({ title: 'No disponible', message: 'No se pudo abrir el menú de compartir', mode: 'danger' });
            }
        }
    };

    const share = () => setShareMenuOpen(value => !value);

    const copyCodigo = () => {
        if (!figura?.codigo) return;
        navigator.clipboard?.writeText(figura.codigo).then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Código copiado al portapapeles', mode: 'success' });
        });
    };

    const copyMetadata = () => {
        if (!isLogged) return;

        const tags = (figura.etiquetas || [])
            .map(tag => String(tag.nombre || '').trim().replace(/\s+/g, ''))
            .filter(Boolean)
            .map(tag => `#${tag}`)
            .join(' ');
        const hashtags = [tags, '#figures', '#3dprinting', '#3dfigures'].filter(Boolean).join(' ');
        const canonicalIdentifier = getCanonicalFiguraIdentifier(figura, identifier);
        const url = `${window.location.origin}${getFiguraPath(canonicalIdentifier)}`;
        const metadata = `${figura.nombre || ''}\n${hashtags}\n\nCodigo: ${figura.codigo || ''}\n${url}`;

        navigator.clipboard?.writeText(metadata)?.then(() => {
            f.general.notificacion({ title: 'Listo', message: 'Metadata copiada al portapapeles', mode: 'success' });
        });
    };

    return (
        <>
            <div className={style.shareMenuWrap}>
                <button type="button" className={buttonClassName} onClick={share} aria-expanded={shareMenuOpen}>
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
                                    <SocialIcon src={whatsappIcon} />
                                    WhatsApp
                                </button>
                                <button type="button" onClick={() => {
                                    const { url, text } = getShareData();
                                    openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`);
                                }}>
                                    <SocialIcon src={facebookIcon} />
                                    Facebook
                                </button>
                                <button type="button" onClick={() => shareNative('https://www.instagram.com/')}>
                                    <SocialIcon src={instagramIcon} />
                                    Instagram
                                </button>
                                <button type="button" onClick={() => {
                                    const { text } = getShareData();
                                    openShareUrl(`whatsapp://send?text=${encodeURIComponent(text)}`);
                                }}>
                                    <SocialIcon src={whatsappIcon} />
                                    Historia de WhatsApp
                                </button>
                                <button type="button" onClick={() => shareNative('https://www.facebook.com/')}>
                                    <SocialIcon src={facebookIcon} />
                                    Historia de Facebook
                                </button>
                                <button type="button" onClick={() => shareNative('https://www.instagram.com/')}>
                                    <SocialIcon src={instagramIcon} />
                                    Historia de Instagram
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {!!figura.codigo && (
                <button type="button" className={buttonClassName} onClick={copyCodigo}>
                    📋 Copiar código
                </button>
            )}
            {isLogged && (
                <button type="button" className={buttonClassName} onClick={copyMetadata}>
                    📋 Copiar metadata
                </button>
            )}
        </>
    );
};
