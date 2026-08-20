import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { cambiarThema } from '../Core/helper';

import { Main as MainPage } from '../Pages/Main';
import { Galeria as GaleriaPage } from '../Pages/Galeria';
import { McpInfo as McpInfoPage } from '../Pages/McpInfo';
import { FigurasPersonalizadas as FigurasPersonalizadasPage } from '../Pages/FigurasPersonalizadas';
import { P404 } from '../Pages/P404';

import { AdminGuard } from '../Pages/Admin/AdminGuard';
import { AdminLogin } from '../Pages/Admin/Login';
import { AdminFiguras } from '../Pages/Admin/Figuras';
import { AdminEtiquetas } from '../Pages/Admin/Etiquetas';
import { AdminSesiones } from '../Pages/Admin/Sesiones';

import { store } from './store';
import { Provider } from "react-redux";
import { useStates } from '../Hooks/useStates';

import { ToastStack } from '../Components/Toast';
import { ErrorBoundary } from '../Components/ErrorBoundary';

const AppCrashFallback = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center' }}>
        <span style={{ fontSize: '2rem' }}>⚠️</span>
        <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>Algo salió mal. Intenta recargar la página.</p>
        <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
        >
            Recargar
        </button>
    </div>
);

function AppUI() {
    const { ls, f } = useStates();

    useEffect(() => {
        cambiarThema(ls?.theme);
    }, [ls?.theme]);

    useEffect(() => {
        f.app.getModes();
    }, []);

    return (
        <div className={`text-[var(--my-minor)] bg-my-${ls.theme}`}>
            <ErrorBoundary fallback={<AppCrashFallback />}>
                <Routes>
                    {/* -----------   ADMIN (no indexado)   ----------- */}
                    <Route path="admin/login" element={<AdminLogin />} />
                    <Route path="admin" element={<AdminGuard><MainPage /></AdminGuard>}>
                        <Route path="" element={<AdminFiguras />} />
                        <Route path="figuras" element={<AdminFiguras />} />
                        <Route path="etiquetas" element={<AdminEtiquetas />} />
                        <Route path="sesiones" element={<AdminSesiones />} />
                        <Route path="*" element={<P404 />} />
                    </Route>

                    {/* -----------   CATALOGO PUBLICO   ----------- */}
                    <Route path="" element={<MainPage />}>
                        <Route path="" element={<GaleriaPage />} />
                        <Route path="etiqueta/:tagIdentifier" element={<GaleriaPage />} />
                        <Route path="figura/:identifier" element={<GaleriaPage />} />
                        <Route path="mcp-info" element={<McpInfoPage />} />
                        <Route path="figuras-personalizadas" element={<FigurasPersonalizadasPage />} />
                        <Route path="*" element={<P404 />} />
                    </Route>
                </Routes>
            </ErrorBoundary>

            <ToastStack />
        </div>
    );
}

function App(props) {
    return (
        <Provider store={store}>
            <AppUI />
        </Provider>
    );
}

export default App;
