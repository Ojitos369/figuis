import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Scene } from './Scene';
import { Loader } from '../Loader';
import style from './styles/index.module.scss';

// Visor 3D interactivo (rotar/zoom con mouse o dedo) para un archivo .stl.
export const STLViewer = ({ url }) => {
    return (
        <div className={style.viewer}>
            <Canvas camera={{ position: [4, 3, 6], fov: 45 }} shadows>
                <Suspense fallback={null}>
                    <Scene url={url} />
                </Suspense>
            </Canvas>
        </div>
    );
};

export const STLViewerFallback = () => (
    <div className={style.loading}><Loader label="Cargando visor 3D..." /></div>
);
