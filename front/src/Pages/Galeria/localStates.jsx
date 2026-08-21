import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useStates } from '../../Hooks/useStates';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_ALIAS } from '../../constants/seo';
import style from './styles/index.module.scss';
import { getCanonicalFiguraIdentifier, getFiguraPath, isFiguraIdentifierFor } from './figuraUrl';
import {
    getCanonicalTagIdentifier,
    getTagName,
    getTagPath,
    isTagIdentifierFor,
} from './tagUrl';

const FILTER_PARAM_KEYS = ['s', 'tags', 'reacciones', 'orden', 'desde', 'hasta', 'page', 'limit'];
const DEFAULT_ORDER = 'fecha_desc';
const DEFAULT_LIMIT = 24;

const uniqueList = (values) => [...new Set(values.map(value => String(value).trim()).filter(Boolean))];

const readListParam = (params, key) => uniqueList((params.get(key) || '').split(','));

const readPositiveInt = (params, key, fallback) => {
    const value = Number.parseInt(params.get(key) || '', 10);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

const cleanMetaText = (value, maxLength = 160) => String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const collectionDocumentTitle = (collection) => {
    const name = cleanMetaText(collection?.nombre || collection?.name || 'Colección', 80);
    const foldedName = name.toLocaleLowerCase('es-MX');
    const seen = new Set();
    const tags = (collection?.etiquetas || collection?.tags || [])
        .map(getTagName)
        .filter(tag => {
            const foldedTag = tag.toLocaleLowerCase('es-MX');
            if (!foldedTag || foldedName.includes(foldedTag) || seen.has(foldedTag)) return false;
            seen.add(foldedTag);
            return true;
        })
        .slice(0, 2);
    const qualifier = tags.length ? ` · ${tags.join(', ')}` : '';
    return cleanMetaText(`${name}${qualifier} | ${SITE_ALIAS}`, 120);
};

const collectionMetaDescription = (collection) => {
    const name = cleanMetaText(collection?.nombre || collection?.name || 'Esta colección', 80);
    const tags = (collection?.etiquetas || collection?.tags || []).map(getTagName).filter(Boolean);
    const editorial = cleanMetaText(collection?.descripcion || collection?.description, 160);
    const lead = tags.length
        ? `${name} en ${SITE_ALIAS} está clasificada en ${tags.slice(0, 4).join(', ')}.`
        : `Explora ${name} en el catálogo público de ${SITE_ALIAS}.`;
    return cleanMetaText(`${lead}${editorial ? ` ${editorial}` : ''}`, 220);
};

const resolvePublicOrigin = () => {
    const canonicalHref = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
    try {
        const canonical = new URL(canonicalHref || '/', window.location.origin);
        if (canonical.protocol === 'http:' || canonical.protocol === 'https:') return canonical.origin;
    } catch {
        // En Vite puede no existir canonical; el origen actual sigue siendo válido.
    }
    return window.location.origin;
};

const absolutePublicUrl = (value, origin) => {
    try {
        return new URL(value, origin).href;
    } catch {
        return origin;
    }
};

const setMetaContent = (attribute, key, content) => {
    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
};

const setCanonicalUrl = (url) => {
    let element = document.head.querySelector('link[rel="canonical"]');
    if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', 'canonical');
        document.head.appendChild(element);
    }
    element.setAttribute('href', url);
};

const updateDocumentMetadata = ({ title, description, url, robots = 'index,follow,max-image-preview:large' }) => {
    document.title = title;
    setMetaContent('name', 'description', description);
    setMetaContent('name', 'robots', robots);
    setMetaContent('property', 'og:title', title);
    setMetaContent('property', 'og:description', description);
    setMetaContent('property', 'og:url', url);
    setMetaContent('name', 'twitter:title', title);
    setMetaContent('name', 'twitter:description', description);
    setCanonicalUrl(url);
};

export const localStates = () => {
    const { s } = useStates();
    const { identifier, tagIdentifier } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const figuras = useMemo(() => s.catalogo?.figuras || [], [s.catalogo?.figuras]);
    const pagination = useMemo(() => s.catalogo?.pagination || null, [s.catalogo?.pagination]);
    const loading = useMemo(() => s.loadings?.catalogo?.figuras, [s.loadings?.catalogo?.figuras]);
    const etiquetas = useMemo(() => s.catalogo?.etiquetas || [], [s.catalogo?.etiquetas]);
    const reaccionesDisponibles = useMemo(() => s.catalogo?.reaccionesDisponibles || [], [s.catalogo?.reaccionesDisponibles]);

    const figuraActual = useMemo(() => s.catalogo?.figuraActual, [s.catalogo?.figuraActual]);
    const loadingDetail = useMemo(() => s.loadings?.catalogo?.figura, [s.loadings?.catalogo?.figura]);
    const rawTagActual = useMemo(() => s.catalogo?.tagActual, [s.catalogo?.tagActual]);
    const loadingTag = useMemo(() => s.loadings?.catalogo?.tag, [s.loadings?.catalogo?.tag]);

    // La URL es la fuente de verdad: links compartidos, recargas y back/forward
    // reproducen exactamente la misma consulta sin una segunda copia en Redux.
    const filters = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            q: params.get('s') || '',
            selectedTags: readListParam(params, 'tags'),
            selectedReacciones: readListParam(params, 'reacciones'),
            page: readPositiveInt(params, 'page', 1),
            orden: params.get('orden') || DEFAULT_ORDER,
            desde: params.get('desde') || '',
            hasta: params.get('hasta') || '',
            limit: readPositiveInt(params, 'limit', DEFAULT_LIMIT),
            filtersOpen: params.get('filtros') === '1',
        };
    }, [location.search]);

    const {
        q, selectedTags, selectedReacciones, page, orden,
        desde, hasta, limit, filtersOpen,
    } = filters;

    const tagActual = useMemo(() => (
        tagIdentifier && rawTagActual && isTagIdentifierFor(tagIdentifier, rawTagActual)
            ? rawTagActual
            : null
    ), [tagIdentifier, rawTagActual]);
    const tagNotFound = !!tagIdentifier && rawTagActual === false;
    const routeTagFilter = tagActual?.id || getTagName(tagActual);

    const effectiveSelectedTags = useMemo(
        () => uniqueList([routeTagFilter, ...selectedTags]),
        [routeTagFilter, selectedTags]
    );

    const selectedTagDetails = useMemo(() => effectiveSelectedTags.map(tagId => {
        if (tagActual && String(tagActual.id || getTagName(tagActual)) === String(tagId)) return tagActual;
        return etiquetas.find(tag => String(tag.id) === String(tagId)) || { id: tagId, nombre: '' };
    }), [effectiveSelectedTags, etiquetas, tagActual]);

    const updateParams = useCallback((changes, { pathname = location.pathname, replace = true } = {}) => {
        const params = new URLSearchParams(location.search);
        Object.entries(changes).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '' || value === false) params.delete(key);
            else params.set(key, String(value));
        });
        const query = params.toString();
        navigate(`${pathname}${query ? `?${query}` : ''}`, { replace, state: location.state });
    }, [location.pathname, location.search, location.state, navigate]);

    const openFilters = useCallback(() => {
        updateParams({ filtros: '1' }, { replace: false });
    }, [updateParams]);

    const closeFilters = useCallback(() => navigate(-1), [navigate]);

    const applyFilters = useCallback(() => {
        updateParams({ filtros: null, page: null });
    }, [updateParams]);

    const toggleTag = useCallback((tagId) => {
        const normalizedId = String(tagId);
        const routeId = tagActual?.id == null ? '' : String(tagActual.id);

        if (routeId && routeId === normalizedId) {
            const next = selectedTags.filter(value => String(value) !== normalizedId);
            updateParams({ tags: next.length ? next.join(',') : null, page: null }, { pathname: '/' });
            return;
        }

        const next = selectedTags.includes(normalizedId)
            ? selectedTags.filter(value => value !== normalizedId)
            : [...selectedTags, normalizedId];
        updateParams({ tags: next.length ? next.join(',') : null, page: null });
    }, [selectedTags, tagActual, updateParams]);

    const toggleReaccionFiltro = useCallback((emoji) => {
        const next = selectedReacciones.includes(emoji)
            ? selectedReacciones.filter(value => value !== emoji)
            : [...selectedReacciones, emoji];
        updateParams({ reacciones: next.length ? next.join(',') : null, page: null });
    }, [selectedReacciones, updateParams]);

    const setQ = useCallback(value => updateParams({ s: value || null, page: null }), [updateParams]);
    const setOrden = useCallback(value => updateParams({ orden: value === DEFAULT_ORDER ? null : value, page: null }), [updateParams]);
    const setDesde = useCallback(value => updateParams({ desde: value || null, page: null }), [updateParams]);
    const setHasta = useCallback(value => updateParams({ hasta: value || null, page: null }), [updateParams]);
    const setPage = useCallback(value => updateParams({ page: Number(value) === 1 ? null : value }), [updateParams]);

    const clearFilters = useCallback(() => {
        const changes = Object.fromEntries(FILTER_PARAM_KEYS.map(key => [key, null]));
        updateParams(changes, { pathname: '/' });
    }, [updateParams]);

    const activeFiltersCount = useMemo(
        () => effectiveSelectedTags.length
            + selectedReacciones.length
            + (orden !== DEFAULT_ORDER ? 1 : 0)
            + (q ? 1 : 0)
            + (desde ? 1 : 0)
            + (hasta ? 1 : 0),
        [effectiveSelectedTags, selectedReacciones, orden, q, desde, hasta]
    );

    const hasArbitraryFilters = Boolean(
        q
        || selectedTags.length
        || selectedReacciones.length
        || orden !== DEFAULT_ORDER
        || desde
        || hasta
        || page !== 1
        || limit !== DEFAULT_LIMIT
    );

    const getPageHref = useCallback((nextPage) => {
        const params = new URLSearchParams(location.search);
        params.delete('filtros');
        if (nextPage > 1) params.set('page', String(nextPage));
        else params.delete('page');
        const query = params.toString();
        return `${location.pathname}${query ? `?${query}` : ''}`;
    }, [location.pathname, location.search]);

    const getTagHref = useCallback((tagOrId) => {
        if (typeof tagOrId === 'object' && tagOrId) return getTagPath(tagOrId);
        const matchingTag = etiquetas.find(tag => String(tag.id) === String(tagOrId));
        return getTagPath(matchingTag || tagOrId);
    }, [etiquetas]);

    const openDetail = useCallback((figuraIdentifier) => {
        const params = new URLSearchParams(location.search);
        if (tagActual?.id) {
            const contextTags = uniqueList([tagActual.id, ...readListParam(params, 'tags')]);
            params.set('tags', contextTags.join(','));
        }
        const query = params.toString();
        navigate(`${getFiguraPath(figuraIdentifier)}${query ? `?${query}` : ''}`, {
            state: {
                catalogPath: location.pathname,
                catalogSearch: location.search,
            },
        });
    }, [navigate, location.pathname, location.search, tagActual]);

    const replaceDetailIdentifier = useCallback((canonicalIdentifier) => {
        if (!canonicalIdentifier || String(canonicalIdentifier) === identifier) return;
        navigate(`${getFiguraPath(canonicalIdentifier)}${location.search}`, {
            replace: true,
            state: location.state,
        });
    }, [identifier, navigate, location.search, location.state]);

    const replaceTagIdentifier = useCallback((canonicalIdentifier) => {
        if (!canonicalIdentifier || String(canonicalIdentifier) === tagIdentifier) return;
        navigate(`${getTagPath(canonicalIdentifier)}${location.search}`, {
            replace: true,
            state: location.state,
        });
    }, [tagIdentifier, navigate, location.search, location.state]);

    const closeDetail = useCallback(() => {
        if (location.state?.catalogPath) {
            navigate(-1);
            return;
        }
        navigate(`/${location.search}`, { replace: true });
    }, [navigate, location.search, location.state]);

    const tagNames = selectedTagDetails.map(getTagName).filter(Boolean);
    const cleanQuery = cleanMetaText(q, 80);
    const total = Number.isFinite(Number(pagination?.total)) ? Number(pagination.total) : null;
    const totalLabel = total === null
        ? 'colecciones públicas'
        : `${total} ${total === 1 ? 'colección pública' : 'colecciones públicas'}`;
    const tagName = getTagName(tagActual);
    const tagDisplayName = tagName
        ? `${tagName.slice(0, 1).toLocaleUpperCase('es-MX')}${tagName.slice(1)}`
        : '';

    let catalogHeading = `${SITE_ALIAS}: figuras 3D, K-pop y coleccionables`;
    if (tagNotFound) catalogHeading = 'Etiqueta no encontrada';
    else if (tagDisplayName) catalogHeading = `Figuras 3D con la etiqueta ${tagDisplayName}`;
    else if (cleanQuery) catalogHeading = `Resultados para “${cleanQuery}”`;
    else if (tagNames.length) catalogHeading = `Colecciones con ${tagNames.join(', ')}`;

    let catalogSummary = 'Explora figuras 3D, figuras coleccionables y figuras kpop en las colecciones públicas de Figuis. La mayoría incluye opción Funko, chibi, figura coleccionable e Hipper (estilo Sonny Angel). Este catálogo es informativo y no indica existencias ni disponibilidad de venta.';
    if (tagNotFound) catalogSummary = 'La etiqueta solicitada no existe o ya no está disponible en el catálogo público de Figuis.';
    else if (tagDisplayName) catalogSummary = `${totalLabel} de Figuis ${total === 1 ? 'está clasificada' : 'están clasificadas'} con ${tagDisplayName}. Explora sus imágenes y referencias publicadas.`;
    else if (cleanQuery) catalogSummary = `${totalLabel} coinciden con “${cleanQuery}” en el catálogo público de Figuis.`;
    else if (activeFiltersCount) catalogSummary = `${totalLabel} coinciden con los filtros seleccionados en el catálogo público de Figuis.`;

    const pageSuffix = page > 1 ? ` · Página ${page}` : '';
    let catalogMetaTitle = DEFAULT_TITLE;
    if (tagDisplayName) catalogMetaTitle = `${tagDisplayName}: figuras y colecciones 3D${pageSuffix} | ${SITE_ALIAS}`;
    else if (cleanQuery) catalogMetaTitle = `Resultados para “${cleanQuery}”${pageSuffix} · ${SITE_ALIAS}`;
    else if (activeFiltersCount) catalogMetaTitle = `Catálogo filtrado${pageSuffix} · ${SITE_ALIAS}`;

    let catalogMetaDescription = cleanMetaText(catalogSummary);
    if (tagDisplayName && tagActual) {
        const collections = Number(tagActual.collection_count || 0);
        catalogMetaDescription = cleanMetaText(
            `${tagDisplayName} reúne ${collections} ${collections === 1 ? 'colección pública' : 'colecciones públicas'} en ${SITE_ALIAS}, publicadas para consulta.`
        );
    }

    const publicOrigin = useMemo(resolvePublicOrigin, []);
    const tagCanonicalUrl = tagActual?.canonical_url || tagActual?.url;
    const catalogCanonicalUrl = tagCanonicalUrl
        ? absolutePublicUrl(tagCanonicalUrl, publicOrigin)
        : `${publicOrigin}${tagIdentifier ? getTagPath(getCanonicalTagIdentifier(tagActual, tagIdentifier)) : '/'}`;

    return {
        style, identifier, tagIdentifier, figuras, pagination, loading, etiquetas, reaccionesDisponibles,
        figuraActual, loadingDetail, tagActual, tagNotFound, loadingTag,
        q, setQ, selectedTags: effectiveSelectedTags, toggleTag,
        selectedReacciones, toggleReaccionFiltro, page, setPage,
        orden, setOrden, desde, setDesde, hasta, setHasta, limit,
        filtersOpen, openFilters, closeFilters, applyFilters, activeFiltersCount, clearFilters,
        openDetail, closeDetail, replaceDetailIdentifier, replaceTagIdentifier, getPageHref, getTagHref,
        effectiveSelectedTags, selectedTagDetails, hasArbitraryFilters,
        catalogHeading, catalogSummary, catalogMetaTitle,
        catalogMetaDescription,
        catalogCanonicalUrl, publicOrigin,
    };
};

export const localEffects = (ls) => {
    const { f } = useStates();
    const requestedIdentifierRef = useRef(null);
    const requestedTagIdentifierRef = useRef(null);

    useEffect(() => {
        f.auth.validateLogin();
    }, []);

    useEffect(() => {
        f.u1('page', 'title', 'Catálogo');
        f.u1('page', 'actual', 'index');
        f.u1('sidebar', 'sideMode', undefined);
        f.catalogo.getEtiquetas();
        f.catalogo.getReacciones();
    }, []);

    useEffect(() => {
        if (!ls.tagIdentifier) {
            // Un detalle abierto desde una landing conserva la grilla y la
            // etiqueta de origen; al cerrarlo volverá por historial sin otra
            // petición ni un parpadeo del catálogo general.
            if (ls.identifier && requestedTagIdentifierRef.current !== null) return;
            if (requestedTagIdentifierRef.current !== null) f.catalogo.resetFiguras();
            requestedTagIdentifierRef.current = null;
            f.u1('catalogo', 'tagActual', null);
            return;
        }
        const loadedIdentifier = getCanonicalTagIdentifier(ls.tagActual);
        const isCanonicalRewrite = requestedTagIdentifierRef.current !== null
            && loadedIdentifier === ls.tagIdentifier;
        requestedTagIdentifierRef.current = ls.tagIdentifier;
        if (!isCanonicalRewrite) {
            f.catalogo.resetFiguras();
            f.catalogo.getTag(ls.tagIdentifier);
        }
    }, [ls.tagIdentifier, ls.identifier]);

    useEffect(() => {
        if (!ls.tagIdentifier || !ls.tagActual) return;
        const canonicalIdentifier = getCanonicalTagIdentifier(ls.tagActual, ls.tagIdentifier);
        ls.replaceTagIdentifier(canonicalIdentifier);
    }, [ls.tagIdentifier, ls.tagActual, ls.replaceTagIdentifier]);

    useEffect(() => {
        if (ls.tagIdentifier && !ls.tagActual) return undefined;
        const timeout = setTimeout(() => {
            f.catalogo.getFiguras({
                q: ls.q || undefined,
                etiquetas: ls.effectiveSelectedTags.length ? ls.effectiveSelectedTags.join(',') : undefined,
                reacciones: ls.selectedReacciones.length ? ls.selectedReacciones.join(',') : undefined,
                orden: ls.orden || undefined,
                desde: ls.desde || undefined,
                hasta: ls.hasta || undefined,
                page: ls.page,
                limit: ls.limit,
            });
        }, 300);
        return () => clearTimeout(timeout);
    }, [ls.tagIdentifier, ls.tagActual, ls.q, ls.effectiveSelectedTags, ls.selectedReacciones, ls.orden, ls.desde, ls.hasta, ls.page, ls.limit]);

    useEffect(() => {
        if (!ls.identifier) {
            requestedIdentifierRef.current = null;
            return;
        }
        const loadedIdentifier = getCanonicalFiguraIdentifier(ls.figuraActual);
        const isCanonicalRewrite = requestedIdentifierRef.current !== null
            && loadedIdentifier === ls.identifier;
        requestedIdentifierRef.current = ls.identifier;
        if (!isCanonicalRewrite) f.catalogo.getFigura(ls.identifier);
    }, [ls.identifier]);

    useEffect(() => {
        if (!ls.identifier || !ls.figuraActual) return;
        if (!isFiguraIdentifierFor(ls.identifier, ls.figuraActual)) return;
        const canonicalIdentifier = getCanonicalFiguraIdentifier(ls.figuraActual);
        ls.replaceDetailIdentifier(canonicalIdentifier);
    }, [ls.identifier, ls.figuraActual, ls.replaceDetailIdentifier]);

    useEffect(() => {
        if (!ls.identifier) return;
        f.catalogo.getFiguraPagina(ls.identifier, {
            q: ls.q || undefined,
            etiquetas: ls.effectiveSelectedTags.length ? ls.effectiveSelectedTags.join(',') : undefined,
            reacciones: ls.selectedReacciones.length ? ls.selectedReacciones.join(',') : undefined,
            orden: ls.orden || undefined,
            desde: ls.desde || undefined,
            hasta: ls.hasta || undefined,
            limit: ls.limit,
        }, (result) => {
            if (result?.page) ls.setPage(result.page);
        });
        // La página de fondo solo se resuelve al abrir un detalle directo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const catalogUrl = `${ls.publicOrigin}/`;
        const restoreCatalogMetadata = () => {
            updateDocumentMetadata({
                title: DEFAULT_TITLE,
                description: DEFAULT_DESCRIPTION,
                url: catalogUrl,
            });
        };

        if (!ls.identifier) {
            updateDocumentMetadata({
                title: ls.catalogMetaTitle,
                description: ls.catalogMetaDescription || DEFAULT_DESCRIPTION,
                url: ls.catalogCanonicalUrl,
                robots: ls.tagNotFound || ls.hasArbitraryFilters
                    ? 'noindex,follow'
                    : 'index,follow,max-image-preview:large',
            });
            return restoreCatalogMetadata;
        }

        if (ls.figuraActual === false) {
            updateDocumentMetadata({
                title: 'Figura no encontrada · Figuis',
                description: 'La figura solicitada no existe o ya no está disponible.',
                url: `${ls.publicOrigin}${getFiguraPath(ls.identifier)}`,
                robots: 'noindex,follow',
            });
            return restoreCatalogMetadata;
        }

        if (ls.figuraActual?.nombre && isFiguraIdentifierFor(ls.identifier, ls.figuraActual)) {
            const canonicalIdentifier = getCanonicalFiguraIdentifier(ls.figuraActual, ls.identifier);
            updateDocumentMetadata({
                title: collectionDocumentTitle(ls.figuraActual),
                description: collectionMetaDescription(ls.figuraActual),
                url: `${ls.publicOrigin}${getFiguraPath(canonicalIdentifier)}`,
            });
        }

        return restoreCatalogMetadata;
    }, [
        ls.identifier, ls.figuraActual, ls.publicOrigin, ls.catalogMetaTitle,
        ls.catalogMetaDescription, ls.catalogCanonicalUrl, ls.tagNotFound,
        ls.hasArbitraryFilters,
    ]);
};
