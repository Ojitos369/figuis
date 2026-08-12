import { useMemo, useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

// Los .stl no vienen centrados ni con una escala consistente (pueden venir en
// mm, cm o unidades arbitrarias del software de origen). Se normaliza a mano
// para que SIEMPRE ocupe el mismo tamaño relativo en la escena, sin depender
// de que la camara "adivine" el encuadre.
const Model = ({ url }) => {
    const geometry = useLoader(STLLoader, url);

    useEffect(() => {
        geometry.computeVertexNormals();
    }, [geometry]);

    const scale = useMemo(() => {
        geometry.computeBoundingBox();
        const box = geometry.boundingBox;
        const size = new THREE.Vector3();
        box.getSize(size);
        geometry.center();
        const maxDim = Math.max(size.x, size.y, size.z);
        return maxDim > 0 && Number.isFinite(maxDim) ? 2 / maxDim : 1;
    }, [geometry]);

    return (
        <mesh geometry={geometry} scale={scale} castShadow receiveShadow>
            <meshStandardMaterial color="#c9c9d6" roughness={0.45} metalness={0.08} />
        </mesh>
    );
};

// Escena simple, sin dependencias de red (nada de HDRs externos: si el fetch
// falla por CORS/VPN/lo que sea, tumba toda la app porque no es un error que
// Suspense pueda atrapar). Solo luces normales + sombra de contacto.
export const Scene = ({ url }) => {
    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
            <directionalLight position={[-5, -3, -5]} intensity={0.35} />

            <Model url={url} />

            <ContactShadows position={[0, -1, 0]} opacity={0.35} scale={6} blur={2} far={3} />
            <OrbitControls makeDefault enableDamping />
        </>
    );
};
