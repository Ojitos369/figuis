const TAG_UUID_SUFFIX = /(?:^|--)([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

const TAG_TRANSLITERATION = {
    'æ': 'ae', 'Æ': 'ae', 'ß': 'ss', 'ø': 'o', 'Ø': 'o',
    'ł': 'l', 'Ł': 'l', 'đ': 'd', 'Đ': 'd', 'ð': 'd', 'Ð': 'd',
    'þ': 'th', 'Þ': 'th', 'œ': 'oe', 'Œ': 'oe', 'ı': 'i',
};

export const getTagName = (tag, fallback = '') => String(
    tag?.nombre || tag?.name || fallback || ''
).trim().replace(/^#+\s*/, '');

export const slugifyTagName = (value) => {
    const transliterated = Array.from(String(value || ''))
        .map(character => TAG_TRANSLITERATION[character] || character)
        .join('');

    return transliterated
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 180)
        .replace(/-+$/g, '') || 'etiqueta';
};

export const getCanonicalTagIdentifier = (tag, fallback = '') => {
    if (tag?.canonical_id) return String(tag.canonical_id);

    const id = tag?.id == null ? '' : String(tag.id).toLowerCase();
    if (id) {
        const slug = String(tag?.slug || slugifyTagName(getTagName(tag))).trim();
        return `${slug}--${id}`;
    }

    return fallback == null ? '' : String(fallback);
};

export const getTagPath = (tagOrIdentifier) => {
    const identifier = typeof tagOrIdentifier === 'object'
        ? getCanonicalTagIdentifier(tagOrIdentifier)
        : String(tagOrIdentifier || '');
    return `/etiqueta/${encodeURIComponent(identifier)}`;
};

export const isTagIdentifierFor = (identifier, tag) => {
    if (!identifier || !tag) return false;

    const requested = String(identifier).toLowerCase();
    const id = tag.id == null ? '' : String(tag.id).toLowerCase();
    if (id && (requested === id || requested.endsWith(`--${id}`))) return true;

    const requestedUuid = requested.match(TAG_UUID_SUFFIX)?.[1];
    if (requestedUuid && id && requestedUuid === id) return true;

    return [tag.canonical_id, tag.slug]
        .filter(Boolean)
        .some(candidate => String(candidate).toLowerCase() === requested);
};
