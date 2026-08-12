import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import { Loader } from '../Loader';
import { ErrorBoundary } from '../ErrorBoundary';
import style from './styles/index.module.scss';

const Fallback3D = () => (
    <div className={style.loading}>
        <span>⚠️ No se pudo cargar el visor 3D.</span>
    </div>
);

// Visor 3D interactivo (rotar/zoom con mouse o dedo) para un archivo .stl.
export const STLViewer = ({ url }) => {
    return (
        <ErrorBoundary fallback={<Fallback3D />}>
            <div className={style.viewer}>
                <Canvas camera={{ position: [4, 3, 6], fov: 45 }} shadows>
                    <Suspense fallback={null}>
                        <Scene url={url} />
                    </Suspense>
                </Canvas>
            </div>
        </ErrorBoundary>
    );
};

export const STLViewerFallback = () => (
    <div className={style.loading}><Loader label="Cargando visor 3D..." /></div>
);
