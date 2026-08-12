import { ViewTransition } from "react";
import { localStates, localEffects } from "./localStates";
import { useChatWs } from "../../Hooks/myHooks/useChatWs";
import { Loader } from "../../Components/Loader";

export const Chat = () => {
    const {
        style, titulo, messages, actualMessage, cargando,
        input, setInput, group, setGroup, isConnected, handleConnect,
    } = localStates();
    const { sendMessage } = useChatWs();
    localEffects();

    const onSend = () => {
        sendMessage(input);
        setInput('');
    };

    return (
        <ViewTransition default="moveLeft">
            <div className={`${style.chatPage}`}>
                <div className={`${style.chatHeader}`}>
                    <h1>{titulo || 'chat'}</h1>
                    <span className={`${style.status} ${isConnected ? style.statusOn : style.statusOff}`}>
                        {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>

                <div className={`${style.chatBox}`}>
                    {messages.length === 0 && !actualMessage && !cargando &&
                        <p className={`${style.empty}`}>No hay mensajes todavía.</p>}

                    {messages.map((msg, index) => {
                        const isMe = typeof msg === 'string' && msg.startsWith('Yo:');
                        const text = isMe ? msg.replace(/^Yo:\s?/, '') : msg;
                        return (
                            <p
                                key={index}
                                className={`${style.message} ${isMe ? style.mine : style.theirs}`}
                            >
                                {text}
                            </p>
                        );
                    })}

                    {actualMessage &&
                        <p className={`${style.message} ${style.theirs} ${style.streaming}`}>{actualMessage}</p>}

                    {cargando && <Loader variant="dots" label="Escribiendo…" />}
                </div>

                {!isConnected &&
                    <div className={`${style.inputArea}`}>
                        <input
                            className={`${style.input}`}
                            type="text"
                            placeholder="Nombre del grupo"
                            value={group}
                            onChange={(e) => setGroup(e.target.value)}
                        />
                        <button className={`${style.btn} ${style.btnPrimary}`} onClick={handleConnect}>
                            Conectar
                        </button>
                    </div>}

                {isConnected &&
                    <div className={`${style.inputArea}`}>
                        <input
                            className={`${style.input}`}
                            type="text"
                            placeholder="Escribe un mensaje…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onSend()}
                        />
                        <button className={`${style.btn} ${style.btnPrimary}`} onClick={onSend}>
                            Enviar
                        </button>
                    </div>}
            </div>
        </ViewTransition>
    );
};
