import { useEffect, useMemo } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { cambiarThema } from '../Core/helper';
import { settings } from '../Core/settings';
import { Theme } from '../Components/Theme';

import { Main as MainPage } from '../Pages/Main';
import { Index as IndexPage } from '../Pages/Index';
import { Test as TestPage } from '../Pages/Test';
import { Chat as ChatPage } from '../Pages/Chat';

import { Login as LoginPage } from '../Pages/Login';
import { P404 } from '../Pages/P404';

import { store } from './store';
import { Provider } from "react-redux";
import { useStates } from '../Hooks/useStates';

import { GeneralNotification } from '../Components/Modals/general/GeneralNotification'; 


function AppUI() {
    const { ls, s, f } = useStates();
    const logged = useMemo(() => s.auth?.logged, [s.auth?.logged]);
    // interruptor en Index (ls.showLogin); settings.showLogin es el valor por defecto
    const showLogin = useMemo(() => ls.showLogin ?? settings.showLogin, [ls.showLogin]);

    useEffect(() => {
        cambiarThema(ls?.theme);
    }, [ls?.theme]);

    useEffect(() => {
        f.app.getModes();
        // f.u1('sidebar', 'open', true);
    }, []);

    useEffect(() => {
        if (!showLogin) return;
        f.auth.validateLogin();
    }, [location.href, showLogin]);

    if (showLogin && !logged) {
        return (
            <div className={`text-[var(--my-minor)] bg-my-${ls.theme}`}>
                <Routes>
                    <Route path="" element={ <LoginPage /> } />
                    <Route path="test" element={ <TestPage /> } />
                    <Route path="*" element={ <LoginPage /> } />
                </Routes>
                <Theme />
                {!!s.modals?.general?.notification &&
                <GeneralNotification />}
            </div>
        )
    }

    return (
        <div className={`text-[var(--my-minor)] bg-my-${ls.theme}`}>
            <Routes>
                <Route path="" element={ <MainPage /> } >
                    <Route path="" element={ <IndexPage /> } />
                    <Route path="chat/*" element={ <ChatPage /> } />
                    <Route path="test/*" element={ <TestPage /> } />
                    <Route path="*" element={ <P404 /> } />
                    {/* -----------   /404   ----------- */}
                </Route>
            </Routes>

            {!!s.modals?.general?.notification &&
            <GeneralNotification />}
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
