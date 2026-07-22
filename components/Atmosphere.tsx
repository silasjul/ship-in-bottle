'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useLevaStore } from '@/stores/levaStore';
import Dust from '@/components/Dust';
import {
  atmosphereVertexShader,
  atmosphereFragmentShader,
} from '@/lib/atmosphereShaders';

const DEG2RAD = Math.PI / 180;

// Module singleton: the react-hooks lint forbids mutating hook-created objects,
// and this material is updated every frame. One backdrop per app.
const domeMaterial = new THREE.ShaderMaterial({
  vertexShader: atmosphereVertexShader,
  fragmentShader: atmosphereFragmentShader,
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    time: { value: 0 },
    colorBottom: { value: new THREE.Color() },
    colorTop: { value: new THREE.Color() },
    glowColor: { value: new THREE.Color() },
    glowDir: { value: new THREE.Vector3(0, 1, 0) },
    glowIntensity: { value: 1 },
    glowSharpness: { value: 16 },
    haze: { value: 0.4 },
    drift: { value: 0.25 },
    rays: { value: 0.35 },
    raySpeed: { value: 0.2 },
    stars: { value: 0.3 },
  },
});

export default function Atmosphere() {
  const cfg = useLevaStore((s) => s.atmosphere);
  const sunElevation = useLevaStore((s) => s.water.sunElevation);
  const sunAzimuth = useLevaStore((s) => s.water.sunAzimuth);

  useEffect(() => {
    const u = domeMaterial.uniforms;
    (u.colorBottom.value as THREE.Color).set(cfg.colorBottom);
    (u.colorTop.value as THREE.Color).set(cfg.colorTop);
    (u.glowColor.value as THREE.Color).set(cfg.glowColor);
    u.glowIntensity.value = cfg.glowIntensity;
    u.glowSharpness.value = 2 / (cfg.glowSize * cfg.glowSize);
    u.haze.value = cfg.haze;
    u.drift.value = cfg.drift;
    u.rays.value = cfg.rays;
    u.raySpeed.value = cfg.raySpeed;
    u.stars.value = cfg.stars;
  }, [cfg]);

  // The backdrop glow tracks the water's sun so the whole scene shares one light.
  useEffect(() => {
    const el = sunElevation * DEG2RAD;
    const az = sunAzimuth * DEG2RAD;
    (domeMaterial.uniforms.glowDir.value as THREE.Vector3)
      .set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az))
      .normalize();
  }, [sunElevation, sunAzimuth]);

  useFrame((_, delta) => {
    domeMaterial.uniforms.time.value += delta;
  });

  return (
    <>
      <mesh material={domeMaterial} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[60, 48, 32]} />
      </mesh>
      <Dust />
    </>
  );
}
