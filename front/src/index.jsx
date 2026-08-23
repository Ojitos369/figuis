import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { store } from './App/store';
import { f } from './Hooks/useStates/fs';

// https://animate.style/
import 'animate.css';

// css
import './static/css/tailwind.css';
import './static/css/index.css';

// Conserva los enlaces creados cuando la app usaba HashRouter. La ruta se
// migra antes de montar React para que BrowserRouter lea el destino correcto.
if (window.location.hash.startsWith('#/')) {
  const legacyUrl = new URL(window.location.hash.slice(1), window.location.origin);
  const params = new URLSearchParams(window.location.search);
  const legacyKeys = new Set(legacyUrl.searchParams.keys());
  legacyKeys.forEach(key => params.delete(key));
  legacyUrl.searchParams.forEach((value, key) => params.append(key, value));
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    '',
    `${legacyUrl.pathname}${query ? `?${query}` : ''}`
  );
}

// Hidrata el estado inicial con los datos que el SSR ya resolvió (figura o
// etiqueta, ver core/seo.py::inject_spa_document) para que el primer render
// del cliente no reemplace el contenido bueno del HTML servido por una
// tarjeta vacía mientras React revalida por API — ese hueco es lo que podía
// dejarle a un renderizador (p.ej. Googlebot) una foto de página delgada.
const hydrationNode = document.getElementById('__FIGUIS_STATE__');
if (hydrationNode) {
  try {
    const hydrated = JSON.parse(hydrationNode.textContent || '{}');
    if (hydrated.kind === 'figura' && hydrated.figura) {
      store.dispatch(f.u1({ f0: 'catalogo', f1: 'figuraActual', value: hydrated.figura }));
    } else if (hydrated.kind === 'etiqueta' && hydrated.tag) {
      store.dispatch(f.u1({ f0: 'catalogo', f1: 'tagActual', value: hydrated.tag }));
    }
  } catch {
    // JSON inesperado: sigue el flujo normal (la SPA lo resuelve por API).
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);


/*
pnpm i react-loader-spinner react-router-dom react-spinners sweetalert2 sweetalert2-react-content axios animate.css
pnpm i -D gh-pages
*/
