import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStates } from '../../Hooks/useStates';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_INSTAGRAM_URL } from '../../constants/seo';
import instagramIcon from '../../assets/social/instagram.svg';
import style from './styles/index.module.scss';

const PAGE_TITLE = 'Figuras personalizadas · Figuis';
const PAGE_DESCRIPTION = 'Pide una figura 3D personalizada hecha a partir de tu idea, personaje o referencia. Los pedidos se coordinan por Instagram.';

const STEPS = [
    'Escríbenos por Instagram con tu idea, personaje o referencia.',
    'Platicamos detalles: tamaño, pose, colores y acabado.',
    'Confirmamos el pedido y el tiempo de entrega estimado.',
];

const resolvePublicOrigin = (canonicalHref, fallbackOrigin) => {
    if (!canonicalHref) return fallbackOrigin;

    try {
        const canonicalUrl = new URL(canonicalHref, fallbackOrigin);
        if (canonicalUrl.protocol === 'http:' || canonicalUrl.protocol === 'https:') {
            return canonicalUrl.origin;
        }
    } catch {
        // Un canonical invalido no debe impedir que la pagina funcione en dev.
    }

    return fallbackOrigin;
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
        element.rel = 'canonical';
        document.head.appendChild(element);
    }
    element.href = url;
};

const updateMetadata = ({ title, description, url, robots = 'index,follow,max-image-preview:large' }) => {
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

export const FigurasPersonalizadas = () => {
    const { f } = useStates();
    const injectedCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const publicOrigin = resolvePublicOrigin(injectedCanonical, window.location.origin);
    const canonicalUrl = `${publicOrigin}/figuras-personalizadas`;

    useEffect(() => {
        f.u1('page', 'actual', 'figuras-personalizadas');
        f.u1('page', 'title', 'Figuras personalizadas');
        f.u1('sidebar', 'sideMode', undefined);
        updateMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: canonicalUrl });

        return () => {
            updateMetadata({
                title: DEFAULT_TITLE,
                description: DEFAULT_DESCRIPTION,
                url: `${publicOrigin}/`,
            });
        };
    }, []);

    return (
        <main className={style.page}>
            <header className={style.hero}>
                <span className={style.eyebrow}>Pedidos a la medida</span>
                <h1>Figuras personalizadas</h1>
                <p>
                    ¿Tienes una idea, un personaje o una referencia? Pide una figura 3D hecha a la
                    medida. Los pedidos personalizados se coordinan directamente por Instagram.
                </p>
                <a
                    className={style.instagramButton}
                    href={SITE_INSTAGRAM_URL}
                    target="_blank"
                    rel="me noopener noreferrer"
                >
                    <img src={instagramIcon} alt="" className={style.instagramIcon} />
                    Escríbenos por Instagram (@figuis.3d)
                </a>
            </header>

            <section className={style.section} aria-labelledby="pasos-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Proceso</span>
                        <h2 id="pasos-title">¿Cómo pido una figura personalizada?</h2>
                    </div>
                </div>
                <ol className={style.steps}>
                    {STEPS.map(step => <li key={step}>{step}</li>)}
                </ol>
            </section>

            <section className={style.section} aria-labelledby="disponibilidad-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Importante</span>
                        <h2 id="disponibilidad-title">Precio y disponibilidad</h2>
                    </div>
                </div>
                <p className={style.notice}>
                    Esta página es informativa: no publica precio, inventario ni disponibilidad de
                    venta. El costo y el tiempo de entrega se cotizan por Instagram según el pedido.
                </p>
            </section>

            <section className={style.section} aria-labelledby="links-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Más formatos</span>
                        <h2 id="links-title">Enlaces relacionados</h2>
                    </div>
                </div>
                <div className={style.linksGrid}>
                    <Link className={style.linkCard} to="/">
                        <strong>Catálogo web</strong><span>Explorar colecciones en Figuis</span>
                    </Link>
                    <a className={style.linkCard} href={SITE_INSTAGRAM_URL} target="_blank" rel="me noopener noreferrer">
                        <strong>Instagram</strong><span>@figuis.3d — pedidos personalizados</span>
                    </a>
                </div>
            </section>
        </main>
    );
};
