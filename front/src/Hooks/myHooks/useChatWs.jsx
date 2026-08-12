import { useEffect, useRef } from 'react';
import { useStates, createState } from '../useStates';

export const useChatWs = () => {
    const { f, s } = useStates();
    const [isConnected, setIsConnected] = createState(['chat', 'isConnected'], false);
    const [group] = createState(['chat', 'group'], 'gen');
    const socketRef = useRef(null);
    const clientIdRef = useRef(Date.now());
    const bufferRef = useRef('');
    const messagesRef = useRef([]);
    messagesRef.current = s.chat?.messages || [];

    const sendMessage = (input) => {
        if (socketRef.current?.readyState === WebSocket.OPEN && input) {
            const newMessages = [...messagesRef.current, `Yo: ${input}`];
            f.u1('chat', 'messages', newMessages);
            socketRef.current.send(input);
            f.u1('chat', 'cargando', true);
        }
    };

    useEffect(() => {
        if (!isConnected) return;

        const wsUrl = `ws://localhost:8369/api/ws/${group}?clientId=${clientIdRef.current}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {};
        ws.onmessage = (event) => {
            const message = event.data;
            if (message !== "-done-") {
                bufferRef.current += message;
                f.u1('chat', 'actualMessage', bufferRef.current);
            } else {
                const newMessages = [...messagesRef.current, bufferRef.current];
                f.u1('chat', 'messages', newMessages);
                f.u1('chat', 'actualMessage', '');
                f.u1('chat', 'cargando', false);
                bufferRef.current = '';
            }
        };
        ws.onclose = () => setIsConnected(false);
        ws.onerror = () => {};

        return () => ws.close();
    }, [isConnected, group]);

    return { sendMessage };
};
