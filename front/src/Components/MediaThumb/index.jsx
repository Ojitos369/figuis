import { getMediaKind } from '../../Core/mediaType';
import { mediaUrl } from '../../constants/api';
import style from './styles/index.module.scss';

// Miniatura consciente del tipo de archivo: imagen, video (silencioso, primer frame) o audio (icono).
export const MediaThumb = ({ url, alt = '', className = '' }) => {
    const kind = getMediaKind(url);
    const src = mediaUrl(url);

    if (kind === 'video') {
        return <video className={`${style.fill} ${className}`} src={src} muted preload="metadata" playsInline />;
    }
    if (kind === 'audio') {
        return (
            <div className={`${style.fill} ${style.audioThumb} ${className}`}>
                <span>🎵</span>
            </div>
        );
    }
    return <img className={`${style.fill} ${className}`} src={src} alt={alt} loading="lazy" />;
};
