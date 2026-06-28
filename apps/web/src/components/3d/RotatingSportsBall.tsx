"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sphere, MeshDistortMaterial } from "@react-three/drei";
import { Suspense } from "react";

function SportsBall() {
  return (
    <Sphere args={[1, 100, 100]} scale={1.3}>
      <MeshDistortMaterial
        color="#c9f458"
        attach="material"
        distort={0.5}
        speed={2}
        roughness={0.2}
      />
    </Sphere>
  );
}

export default function RotatingSportsBall() {
  return (
    <Canvas camera={{ position: [0, 0, 2.5], fov: 40 }} style={{ width: "100%", height: "100%" }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <SportsBall />
        <OrbitControls
          autoRotate
          autoRotateSpeed={4}
          enableZoom={false}
          enablePan={false}
        />
      </Suspense>
    </Canvas>
  );
}
