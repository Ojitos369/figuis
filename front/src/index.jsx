import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

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
