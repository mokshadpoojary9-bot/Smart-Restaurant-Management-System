import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float } from "@react-three/drei";
import * as THREE from "three";

function Plate() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.35;
  });
  return (
    <group ref={ref}>
      {/* Plate base */}
      <mesh castShadow receiveShadow position={[0, -0.35, 0]}>
        <cylinderGeometry args={[1.6, 1.55, 0.12, 96]} />
        <meshStandardMaterial color="#1a1310" roughness={0.15} metalness={0.25} />
      </mesh>
      {/* Rim ring */}
      <mesh position={[0, -0.28, 0]}>
        <torusGeometry args={[1.5, 0.04, 24, 128]} />
        <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.15} roughness={0.2} metalness={0.85} />
      </mesh>
      {/* Center dish (steak-like) */}
      <mesh position={[0, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.9, 0.95, 0.28, 64]} />
        <meshStandardMaterial color="#7c2d12" roughness={0.6} metalness={0.05} />
      </mesh>
      {/* Highlight glaze */}
      <mesh position={[0, 0.0, 0]}>
        <cylinderGeometry args={[0.6, 0.65, 0.06, 48]} />
        <meshStandardMaterial color="#D97706" emissive="#F59E0B" emissiveIntensity={0.4} roughness={0.2} metalness={0.5} />
      </mesh>
      {/* Herbs / dots */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.25) * 0.55, 0.08, Math.sin(i * 1.25) * 0.55]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#10B981" />
        </mesh>
      ))}
    </group>
  );
}

function Particles() {
  const group = useRef();
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.05;
  });
  const items = Array.from({ length: 24 });
  return (
    <group ref={group}>
      {items.map((_, i) => {
        const r = 2.5 + Math.random() * 1.2;
        const t = (i / items.length) * Math.PI * 2;
        const y = (Math.random() - 0.5) * 2;
        return (
          <Float key={i} speed={1.2} rotationIntensity={0.5} floatIntensity={0.8}>
            <mesh position={[Math.cos(t) * r, y, Math.sin(t) * r]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#F59E0B" emissive="#F59E0B" emissiveIntensity={0.8} />
            </mesh>
          </Float>
        );
      })}
    </group>
  );
}

export default function Hero3D() {
  return (
    <div className="w-full h-full" data-testid="hero-3d">
      <Canvas camera={{ position: [0, 1.6, 3.4], fov: 45 }} dpr={[1, 1.8]} gl={{ antialias: true }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 2]} intensity={1.1} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#F43F5E" />
        <Suspense fallback={null}>
          <Float speed={1} rotationIntensity={0.15} floatIntensity={0.6}>
            <Plate />
          </Float>
          <Particles />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}
