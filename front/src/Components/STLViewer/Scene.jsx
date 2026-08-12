import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { Bounds, Center, OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const Model = ({ url }) => {
    const geometry = useLoader(STLLoader, url);
    useEffect(() => { geometry.computeVertexNormals(); }, [geometry]);
    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial color="#c9c9d6" roughness={0.45} metalness={0.08} />
        </mesh>
    );
};

// Escena reusable: centra y encuadra el modelo automaticamente (los STL no
// suelen venir centrados ni en una escala consistente).
export const Scene = ({ url }) => {
    return (
        <>
            <ambientLight intensity={0.6} />
            <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.2} />
            <pointLight position={[-10, -10, -10]} intensity={0.4} />
            <Environment preset="city" />

            <Bounds fit clip observe margin={1.3}>
                <Center>
                    <Model url={url} />
                </Center>
            </Bounds>

            <ContactShadows opacity={0.35} scale={10} blur={2} far={4.5} />
            <OrbitControls makeDefault enableDamping />
        </>
    );
};
