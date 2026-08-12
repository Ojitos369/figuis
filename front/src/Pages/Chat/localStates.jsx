import { useMemo, useEffect } from 'react';
import { useStates, createState } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const { s } = useStates();
    const [titulo, setTitulo] = createState(['page', 'title'], "");
    const [actualPage, setActualPage] = createState(['page', 'actual'], "");
    const [input, setInput] = createState(['chat', 'input'], '');
    const [group, setGroup] = createState(['chat', 'group'], 'gen');
    const [isConnected, setIsConnected] = createState(['chat', 'isConnected'], false);

    const messages = useMemo(() => s.chat?.messages || [], [s.chat?.messages]);
    const actualMessage = useMemo(() => s.chat?.actualMessage || '', [s.chat?.actualMessage]);
    const cargando = useMemo(() => s.chat?.cargando || false, [s.chat?.cargando]);

    const init = () => {
        setTitulo("chat");
        setActualPage("chat");
    };

    const handleConnect = () => setIsConnected(true);

    return {
        style, titulo, init,
        messages, actualMessage, cargando,
        input, setInput,
        group, setGroup,
        isConnected, handleConnect,
    };
};

export const localEffects = () => {
    const { init } = localStates();
    useEffect(() => {
        init();
    }, []);
};
