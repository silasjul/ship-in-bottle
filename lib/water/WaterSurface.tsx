'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import type { WaterSimulation } from './WaterSimulation';
import {
  waterSurfaceVertexShader,
  waterSurfaceFragmentShader,
} from './surfaceShaders';

export type WaterSurfaceConfig = {
  edgeFade: number;
  opacity: number;

  simSpeed: number;
  damping: number;
  rainRate: number;
  dropRadius: number;
  dropStrength: number;

  colorShallow: string;
  colorDeep: string;
  depthFalloff: number;

  sunColor: string;
  sunDirection: THREE.Vector3;

  fresnelF0: number;
  fresnelPower: number;
  reflectivity: number;
  sunGlint: number;
  shininess: number;
};

type WaterSurfaceProps = {
  sim: WaterSimulation;
  geometry: THREE.BufferGeometry;
  envMap: THREE.Texture;
  config: WaterSurfaceConfig;
  interactive?: boolean;
  renderOrder?: number;
};

// Module singleton: the react-hooks lint forbids mutating hook-created objects,
// and this material is updated every frame. One water surface per app.
const surfaceMaterial = new THREE.ShaderMaterial({
  vertexShader: waterSurfaceVertexShader,
  fragmentShader: waterSurfaceFragmentShader,
  transparent: true,
  side: THREE.DoubleSide,
  uniforms: {
    water: { value: null },
    envMap: { value: null },
    localEye: { value: new THREE.Vector3() },
    light: { value: new THREE.Vector3(0, 1, 0) },
    simCenter: { value: new THREE.Vector2() },
    simHalf: { value: new THREE.Vector2(1, 1) },
    heightScale: { value: 1 },
    edgeFade: { value: 0.5 },
    opacity: { value: 0.85 },
    colorShallow: { value: new THREE.Color() },
    colorDeep: { value: new THREE.Color() },
    depthFalloff: { value: 1.2 },
    fresnelF0: { value: 0.12 },
    fresnelPower: { value: 3 },
    reflectivity: { value: 0.75 },
    sunColor: { value: new THREE.Color() },
    sunGlint: { value: 1.5 },
    shininess: { value: 1200 },
  },
});

const tmpMatrix = new THREE.Matrix4();
const tmpEye = new THREE.Vector3();
const lastDrop = new THREE.Vector3();

export default function WaterSurface({
  sim,
  geometry,
  envMap,
  config,
  interactive = true,
  renderOrder = 2,
}: WaterSurfaceProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rainAccumulator = useRef(0);
  const hasLastDrop = useRef(false);

  useEffect(() => {
    surfaceMaterial.uniforms.envMap.value = envMap;
  }, [envMap]);

  useEffect(() => {
    if (!geometry.getAttribute('aEdge')) {
      const count = geometry.getAttribute('position').count;
      const edges = new Float32Array(count).fill(1e3);
      geometry.setAttribute('aEdge', new THREE.BufferAttribute(edges, 1));
    }
  }, [geometry]);

  useEffect(() => {
    const u = surfaceMaterial.uniforms;
    u.edgeFade.value = config.edgeFade;
    u.opacity.value = config.opacity;
    (u.colorShallow.value as THREE.Color).set(config.colorShallow);
    (u.colorDeep.value as THREE.Color).set(config.colorDeep);
    u.depthFalloff.value = config.depthFalloff;
    (u.sunColor.value as THREE.Color).set(config.sunColor);
    (u.light.value as THREE.Vector3).copy(config.sunDirection).normalize();
    u.fresnelF0.value = config.fresnelF0;
    u.fresnelPower.value = config.fresnelPower;
    u.reflectivity.value = config.reflectivity;
    u.sunGlint.value = config.sunGlint;
    u.shininess.value = config.shininess;
  }, [config]);

  useFrame((state, delta) => {
    if (!sim.ready) return;
    const bounds = sim.getBounds()!;

    rainAccumulator.current += delta * config.rainRate;
    while (rainAccumulator.current >= 1) {
      rainAccumulator.current -= 1;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 0.85;
      sim.addDrop(
        bounds.centerX + Math.cos(angle) * r * bounds.halfWidth,
        bounds.centerZ + Math.sin(angle) * r * bounds.halfLength,
        config.dropRadius,
        (Math.random() < 0.5 ? -1 : 1) * config.dropStrength
      );
    }

    const steps = Math.max(1, Math.round(config.simSpeed));
    for (let i = 0; i < steps; i++) sim.step(config.damping);
    sim.updateNormals();

    const u = surfaceMaterial.uniforms;
    u.water.value = sim.textureA.texture;
    u.simCenter.value.set(bounds.centerX, bounds.centerZ);
    u.simHalf.value.set(bounds.halfWidth, bounds.halfLength);
    u.heightScale.value = sim.heightScale;

    const mesh = meshRef.current;
    if (mesh) {
      tmpMatrix.copy(mesh.matrixWorld).invert();
      tmpEye.copy(state.camera.position).applyMatrix4(tmpMatrix);
      (u.localEye.value as THREE.Vector3).copy(tmpEye);
    }
  });

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || !sim.ready) return;
    const mesh = meshRef.current;
    if (!mesh) return;
    const local = mesh.worldToLocal(e.point.clone());
    const minDistance = sim.getBounds()!.halfWidth * 0.02;
    if (hasLastDrop.current && lastDrop.distanceTo(local) < minDistance) return;
    lastDrop.copy(local);
    hasLastDrop.current = true;
    sim.addDrop(local.x, local.z, config.dropRadius, config.dropStrength);
  };

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={surfaceMaterial}
      renderOrder={renderOrder}
      onPointerMove={onPointerMove}
    />
  );
}
