import { getMediaKind } from '../../Core/mediaType';
import { mediaUrl } from '../../constants/api';
import style from './styles/index.module.scss';

// Visor a tamaño completo: imagen, video o audio con controles.
export const MediaViewer = ({ url, alt = '' }) => {
    const kind = getMediaKind(url);
    const src = mediaUrl(url);

    if (kind === 'video') {
        return <video className={style.media} src={src} controls playsInline />;
    }
    if (kind === 'audio') {
        return (
            <div className={style.audioViewer}>
                <span className={style.audioIcon}>🎵</span>
                <audio className={style.audioPlayer} src={src} controls />
            </div>
        );
    }
    return <img className={style.media} src={src} alt={alt} />;
};
