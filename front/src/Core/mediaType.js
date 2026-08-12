const VIDEO_EXT = ['mp4', 'webm', 'mov', 'ogv', 'mkv', 'avi'];
const AUDIO_EXT = ['mp3', 'wav', 'm4a', 'flac', 'aac', 'oga'];

export const getMediaKind = (url) => {
    if (!url) return 'image';
    const ext = url.split('?')[0].split('.').pop().toLowerCase();
    if (VIDEO_EXT.includes(ext)) return 'video';
    if (AUDIO_EXT.includes(ext)) return 'audio';
    return 'image';
};
