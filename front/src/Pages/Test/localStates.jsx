import { useEffect } from 'react';
import { useStates, createState } from '../../Hooks/useStates';
import style from './styles/index.module.scss';

export const localStates = () => {
    const [, setActualPage] = createState(['page', 'actual'], '');
    const [, setTitulo] = createState(['page', 'title'], '');

    const init = () => {
        setActualPage('test');
        setTitulo('test');
    };

    return { style, init };
};

export const indexEffects = () => {
    const { init } = localStates();
    useEffect(() => {
        init();
    }, []);
};
