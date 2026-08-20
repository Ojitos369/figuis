import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Copy } from '../../Components/Icons';
import { useStates } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

const PAGE_TITLE = 'MCP público · Figuis';
const PAGE_DESCRIPTION = 'Conecta clientes MCP al catálogo público de Figuis para consultar colecciones, imágenes y modelos 3D mediante herramientas de solo lectura.';
const DEFAULT_TITLE = 'Figuis · Catálogo de colecciones y modelos 3D';
const DEFAULT_DESCRIPTION = 'Catálogo público de colecciones, figuras, imágenes y modelos 3D para consulta e inspiración.';

const TOOLS = [
    {
        name: 'search',
        params: 'query',
        description: 'Busca texto entre las colecciones públicas y sus modelos 3D. Devuelve IDs, títulos y URLs canónicas.',
    },
    {
        name: 'fetch',
        params: 'id',
        description: 'Obtiene un recurso devuelto por search. Acepta IDs collection: o media: e incluye multimedia al consultar una colección.',
    },
    {
        name: 'list_collections',
        params: 'query?, tags?, page?, limit?',
        description: 'Lista y pagina colecciones públicas, con filtros opcionales por texto y etiquetas.',
    },
    {
        name: 'get_collection',
        params: 'identifier',
        description: 'Consulta una colección por UUID, identificador canónico o slug único y devuelve sus metadatos públicos.',
    },
    {
        name: 'list_collection_media',
        params: 'identifier, media_type?, page?, limit?',
        description: 'Lista resultados, material relacionado o modelos 3D pertenecientes a una colección pública.',
    },
    {
        name: 'search_models',
        params: 'query?, page?, limit?',
        description: 'Busca o lista exclusivamente archivos públicos de modelos 3D y la colección a la que pertenecen.',
    },
];

const EXAMPLE_QUESTIONS = [
    '¿Qué colecciones públicas hay de dragones?',
    'Busca modelos 3D de robots en el catálogo de Figuis.',
    'Muéstrame los archivos multimedia de esta colección.',
    'Encuentra colecciones con las etiquetas fantasía y anime.',
    '¿Qué contiene la colección identificada por este enlace?',
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

const updateMetadata = ({ title, description, url }) => {
    document.title = title;
    setMetaContent('name', 'description', description);
    setMetaContent('property', 'og:title', title);
    setMetaContent('property', 'og:description', description);
    setMetaContent('property', 'og:url', url);
    setMetaContent('name', 'twitter:title', title);
    setMetaContent('name', 'twitter:description', description);
    setCanonicalUrl(url);
};

const CopyButton = ({ label, onClick }) => (
    <button
        type="button"
        className={style.copyButton}
        onClick={onClick}
        title={`Copiar ${label}`}
        aria-label={`Copiar ${label}`}
    >
        <Copy size={16} />
        <span>Copiar</span>
    </button>
);

const CodeBlock = ({ value, label, onCopy }) => (
    <div className={style.codeBlock}>
        <pre><code>{value}</code></pre>
        <CopyButton label={label} onClick={() => onCopy(value, label)} />
    </div>
);

export const McpInfo = () => {
    const { f } = useStates();
    const injectedCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const publicOrigin = resolvePublicOrigin(injectedCanonical, window.location.origin);
    const endpoint = `${publicOrigin}/mcp/`;
    const canonicalUrl = `${publicOrigin}/mcp-info`;
    const clientConfig = JSON.stringify({
        mcpServers: {
            figuis: {
                type: 'streamable-http',
                url: endpoint,
            },
        },
    }, null, 2);
    const inspectorCli = `npx @modelcontextprotocol/inspector --cli ${endpoint} --transport http --method tools/list`;
    const inspectorWeb = `npx @modelcontextprotocol/inspector --web --server-url ${endpoint} --transport http`;

    useEffect(() => {
        f.u1('page', 'actual', 'mcp');
        f.u1('page', 'title', 'MCP');
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

    const copyValue = async (value, label) => {
        if (!navigator.clipboard?.writeText) {
            f.general.notificacion({
                title: 'No disponible',
                message: 'Tu navegador no permite copiar automáticamente.',
                mode: 'warning',
            });
            return;
        }

        try {
            await navigator.clipboard.writeText(value);
            f.general.notificacion({ title: 'Listo', message: `${label} copiado al portapapeles`, mode: 'success' });
        } catch {
            f.general.notificacion({ title: 'No disponible', message: `No se pudo copiar ${label}.`, mode: 'danger' });
        }
    };

    return (
        <main className={style.page}>
            <header className={style.hero}>
                <span className={style.eyebrow}>MCP público de Figuis</span>
                <h1>Consulta el catálogo desde clientes de IA</h1>
                <p>
                    Este servidor remoto permite buscar y leer colecciones públicas, imágenes y modelos 3D
                    mediante el Model Context Protocol. No requiere autenticación y no realiza cambios.
                </p>
                <div className={style.badges} aria-label="Características del servidor MCP">
                    <span>Streamable HTTP</span>
                    <span>Sin autenticación</span>
                    <span>Solo lectura</span>
                    <span>Datos públicos</span>
                </div>
            </header>

            <section className={style.section} aria-labelledby="conexion-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Conexión</span>
                        <h2 id="conexion-title">Datos del servidor</h2>
                    </div>
                </div>

                <div className={style.endpointBox}>
                    <div>
                        <span className={style.fieldLabel}>Endpoint remoto</span>
                        <code>{endpoint}</code>
                    </div>
                    <CopyButton label="endpoint MCP" onClick={() => copyValue(endpoint, 'Endpoint MCP')} />
                </div>

                <dl className={style.factsGrid}>
                    <div><dt>Transporte</dt><dd>Streamable HTTP</dd></div>
                    <div><dt>Autenticación</dt><dd>Ninguna</dd></div>
                    <div><dt>Operaciones</dt><dd>Solo lectura</dd></div>
                    <div><dt>Alcance</dt><dd>Colecciones y multimedia públicas</dd></div>
                </dl>

                <p className={style.notice}>
                    El endpoint es para clientes MCP, no una página web convencional. No expone compras,
                    precios, inventario, disponibilidad de venta ni operaciones de escritura.
                </p>
            </section>

            <section className={style.section} aria-labelledby="tools-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Capacidades</span>
                        <h2 id="tools-title">Herramientas disponibles</h2>
                    </div>
                    <span className={style.countBadge}>{TOOLS.length} herramientas</span>
                </div>

                <div className={style.toolGrid}>
                    {TOOLS.map(tool => (
                        <article key={tool.name} className={style.toolCard}>
                            <code className={style.toolName}>{tool.name}</code>
                            <code className={style.toolParams}>({tool.params})</code>
                            <p>{tool.description}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className={style.section} aria-labelledby="clients-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Configuración</span>
                        <h2 id="clients-title">Conectar desde un cliente MCP</h2>
                    </div>
                </div>
                <p className={style.sectionIntro}>
                    En un cliente compatible con servidores MCP remotos, registra un servidor de tipo
                    <code> streamable-http</code>, usa el endpoint anterior y selecciona autenticación nula o ninguna.
                </p>
                <CodeBlock value={clientConfig} label="configuración MCP" onCopy={copyValue} />

                <h3 className={style.subheading}>Comprobar con MCP Inspector</h3>
                <p className={style.sectionIntro}>
                    Puedes listar las herramientas desde la terminal o abrir la interfaz oficial del Inspector.
                </p>
                <div className={style.commandStack}>
                    <CodeBlock value={inspectorCli} label="comando CLI" onCopy={copyValue} />
                    <CodeBlock value={inspectorWeb} label="comando del Inspector web" onCopy={copyValue} />
                </div>
                <a
                    className={style.inlineLink}
                    href="https://github.com/modelcontextprotocol/inspector"
                    target="_blank"
                    rel="noreferrer"
                >
                    Documentación oficial de MCP Inspector ↗
                </a>
            </section>

            <section className={style.section} aria-labelledby="chatgpt-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Cliente compatible</span>
                        <h2 id="chatgpt-title">Conectar en ChatGPT</h2>
                    </div>
                </div>
                <ol className={style.steps}>
                    <li>Activa el modo desarrollador en ChatGPT.</li>
                    <li>Ve a <strong>Settings</strong> o <strong>Workspace settings → Apps → Create</strong>.</li>
                    <li>Indica el endpoint MCP, selecciona autenticación <strong>None</strong> y usa <strong>Scan Tools</strong>.</li>
                    <li>Crea la app y selecciónala desde las herramientas cuando quieras consultar Figuis.</li>
                </ol>
                <p className={style.notice}>
                    La interfaz, disponibilidad y permisos dependen del plan y del rol, y pueden cambiar. La guía
                    actual contempla MCP remoto de lectura/fetch en Pro y capacidades MCP completas en Business,
                    Enterprise y Edu. El servidor de Figuis es remoto y exclusivamente de lectura.
                </p>
                <a
                    className={style.inlineLink}
                    href="https://help.openai.com/es-419/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt-beta"
                    target="_blank"
                    rel="noreferrer"
                >
                    Guía oficial de modo desarrollador y MCP en ChatGPT ↗
                </a>
            </section>

            <section className={style.section} aria-labelledby="questions-title">
                <div className={style.sectionHeader}>
                    <div>
                        <span className={style.sectionKicker}>Prueba rápida</span>
                        <h2 id="questions-title">Preguntas de ejemplo</h2>
                    </div>
                </div>
                <div className={style.exampleList}>
                    {EXAMPLE_QUESTIONS.map(question => (
                        <div key={question} className={style.exampleItem}>
                            <span>“{question}”</span>
                            <CopyButton label="pregunta" onClick={() => copyValue(question, 'Pregunta')} />
                        </div>
                    ))}
                </div>
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
                    <a className={style.linkCard} href="/catalogo.md">
                        <strong>Catálogo Markdown</strong><span>Representación legible por agentes</span>
                    </a>
                    <a className={style.linkCard} href="/api/public/v1/collections">
                        <strong>API pública JSON</strong><span>Colecciones paginadas y estructuradas</span>
                    </a>
                    <a className={style.linkCard} href="/llms.txt">
                        <strong>llms.txt</strong><span>Índice de fuentes públicas para agentes</span>
                    </a>
                    <a className={style.linkCard} href="/api/public/openapi.json">
                        <strong>Esquema OpenAPI público</strong><span>Contrato de la API pública HTTP</span>
                    </a>
                    <a className={style.linkCard} href="#conexion-title">
                        <strong>Datos de conexión MCP</strong><span>Endpoint remoto y transporte para copiar</span>
                    </a>
                </div>
            </section>
        </main>
    );
};
