export const getCanonicalFiguraIdentifier = (figura, fallback = '') => {
    const identifier = figura?.canonical_id || figura?.id || fallback;
    return identifier == null ? '' : String(identifier);
};

export const getFiguraPath = (identifier) => {
    const pathSegment = identifier == null ? '' : String(identifier);
    return `/figura/${encodeURIComponent(pathSegment)}`;
};

export const isFiguraIdentifierFor = (identifier, figura) => {
    if (!identifier || !figura?.id) return false;

    const requested = String(identifier);
    const realId = String(figura.id).toLowerCase();
    if (requested.toLowerCase() === realId) return true;
    if (requested.toLowerCase().endsWith(`--${realId}`)) return true;

    return [figura.canonical_id, figura.slug]
        .filter(Boolean)
        .some(candidate => String(candidate) === requested);
};
