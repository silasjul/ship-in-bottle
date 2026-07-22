'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLevaStore } from '@/stores/levaStore';
import { dustVertexShader, dustFragmentShader } from '@/lib/dustShaders';

const FIELD_CENTER = { x: 0, y: 0.8, z: 0 };
const FIELD_SIZE = { x: 7, y: 4.5, z: 7 };
const CLEAR_CENTER = { x: 0, y: 0.25, z: 0 };
const CLEAR_RADII = { x: 1.8, y: 1.0, z: 1.0 };

// Module singleton: the react-hooks lint forbids mutating hook-created objects,
// and this material is updated every frame. One dust field per app.
const dustMaterial = new THREE.ShaderMaterial({
  vertexShader: dustVertexShader,
  fragmentShader: dustFragmentShader,
  transparent: true,
  depthWrite: false,
  uniforms: {
    time: { value: 0 },
    pixelRatio: { value: 1 },
    size: { value: 1 },
    opacity: { value: 0.05 },
    color: { value: new THREE.Color('#ffe9c8') },
  },
});

// Uniform box field with an ellipsoid kept clear around the bottle.
function buildDustPositions(count: number, clearance: number) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    let z = 0;
    for (let tries = 0; tries < 20; tries++) {
      x = FIELD_CENTER.x + (Math.random() - 0.5) * FIELD_SIZE.x;
      y = FIELD_CENTER.y + (Math.random() - 0.5) * FIELD_SIZE.y;
      z = FIELD_CENTER.z + (Math.random() - 0.5) * FIELD_SIZE.z;
      if (clearance <= 0) break;
      const qx = (x - CLEAR_CENTER.x) / (CLEAR_RADII.x * clearance);
      const qy = (y - CLEAR_CENTER.y) / (CLEAR_RADII.y * clearance);
      const qz = (z - CLEAR_CENTER.z) / (CLEAR_RADII.z * clearance);
      if (qx * qx + qy * qy + qz * qz >= 1) break;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  return positions;
}

export default function Dust() {
  const cfg = useLevaStore((s) => s.atmosphere);

  const positions = useMemo(
    () => buildDustPositions(cfg.dustCount, cfg.dustClearance),
    [cfg.dustCount, cfg.dustClearance]
  );

  useEffect(() => {
    dustMaterial.uniforms.size.value = cfg.dustSize;
    dustMaterial.uniforms.opacity.value = cfg.dustOpacity;
  }, [cfg]);

  useFrame((state, delta) => {
    dustMaterial.uniforms.time.value += delta;
    dustMaterial.uniforms.pixelRatio.value = state.gl.getPixelRatio();
  });

  if (cfg.dustCount === 0) return null;

  return (
    <points
      key={`${cfg.dustCount}:${cfg.dustClearance}`}
      material={dustMaterial}
    >
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
    </points>
  );
}
