'use client';

import { Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { useLevaStore } from '@/stores/levaStore';
import { getActiveCrossSection, type WaterCrossSection } from '@/lib/waterGeometry';
import { cameraState } from '@/lib/cameraState';
import Bottle from '@/components/Bottle';
import Water from '@/components/Water';
import Ship from '@/components/Ship';
import Atmosphere from '@/components/Atmosphere';
import Effects from '@/components/Effects';

type OrbitControlsLike = { target: THREE.Vector3; update: () => void };

let lastCenteredCrossSection: WaterCrossSection | null = null;
const centerTarget = new THREE.Vector3();

function recenterView(
  controls: OrbitControlsLike,
  camera: THREE.Camera,
  center: THREE.Vector3
) {
  camera.position.add(center.clone().sub(controls.target));
  controls.target.copy(center);
  controls.update();
}

// Keeps the orbit target on the water's actual center, which moves with the
// bottle model transform and fill level.
function CenterOnWater() {
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null;
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    const cs = getActiveCrossSection();
    if (!cs || cs === lastCenteredCrossSection || !controls) return;
    lastCenteredCrossSection = cs;

    const { bottle } = useLevaStore.getState();
    centerTarget.set(
      bottle.position.x + bottle.scale * cs.centerX,
      bottle.position.y + bottle.scale * cs.waterY,
      bottle.position.z + bottle.scale * cs.centerZ
    );
    recenterView(controls, camera, centerTarget);
  });

  return null;
}

function CameraSync() {
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null;
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    cameraState.position.copy(camera.position);
    if (controls) cameraState.target.copy(controls.target);
  });

  return null;
}

function RenderSync() {
  useFrame((state) => {
    const { exposure, envIntensity } = useLevaStore.getState().render;
    state.gl.toneMappingExposure = exposure;
    state.scene.environmentIntensity = envIntensity;
  });

  return null;
}

function BottleAssembly() {
  const cfg = useLevaStore((s) => s.bottle);

  return (
    <group
      position={[cfg.position.x, cfg.position.y, cfg.position.z]}
      scale={cfg.scale}
    >
      <Bottle />
      <Water />
      <Ship />
    </group>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [1.85, 1.63, -4.77], fov: 38 }}
      gl={{ antialias: true, localClippingEnabled: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ReinhardToneMapping;
      }}
    >
      <color attach="background" args={['#05070a']} />

      <Atmosphere />

      <Suspense fallback={null}>
        <Environment files="/sky.hdr" />
        <BottleAssembly />
      </Suspense>

      <Effects />
      <RenderSync />
      <CameraSync />
      <CenterOnWater />
      <OrbitControls
        makeDefault
        enableDamping
        target={[0.09, -0.2, 0]}
        minDistance={1.2}
        maxDistance={40}
      />
    </Canvas>
  );
}
