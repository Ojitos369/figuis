import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { cambiarThema } from '../Core/helper';

import { Main as MainPage } from '../Pages/Main';
import { Galeria as GaleriaPage } from '../Pages/Galeria';
import { P404 } from '../Pages/P404';

import { AdminGuard } from '../Pages/Admin/AdminGuard';
import { AdminLogin } from '../Pages/Admin/Login';
import { AdminFiguras } from '../Pages/Admin/Figuras';
import { AdminEtiquetas } from '../Pages/Admin/Etiquetas';

import { store } from './store';
import { Provider } from "react-redux";
import { useStates } from '../Hooks/useStates';

import { ToastStack } from '../Components/Toast';

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
            <Routes>
                {/* -----------   ADMIN (no indexado)   ----------- */}
                <Route path="admin/login" element={<AdminLogin />} />
                <Route path="admin" element={<AdminGuard><MainPage /></AdminGuard>}>
                    <Route path="" element={<AdminFiguras />} />
                    <Route path="figuras" element={<AdminFiguras />} />
                    <Route path="etiquetas" element={<AdminEtiquetas />} />
                    <Route path="*" element={<P404 />} />
                </Route>

                {/* -----------   CATALOGO PUBLICO   ----------- */}
                <Route path="" element={<MainPage />}>
                    <Route path="" element={<GaleriaPage />} />
                    <Route path="figura/:id" element={<GaleriaPage />} />
                    <Route path="*" element={<P404 />} />
                </Route>
            </Routes>

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
