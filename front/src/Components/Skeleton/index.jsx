import style from './styles/index.module.scss';

// Bloque con shimmer, para placeholders mientras carga contenido real.
export const Skeleton = ({ className = '', style: extraStyle }) => (
    <div className={`${style.skeleton} ${className}`} style={extraStyle} />
);
