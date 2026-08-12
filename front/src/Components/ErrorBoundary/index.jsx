import { Component } from 'react';
import style from './styles/index.module.scss';

// Contiene errores de renderizado (p.ej. WebGL/three.js) para que no tumben
// toda la app - sin esto, un throw en cualquier parte del arbol deja la
// pantalla en blanco/negro por completo.
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className={style.fallback}>
                    <span>⚠️ No se pudo cargar esta parte.</span>
                </div>
            );
        }
        return this.props.children;
    }
}
