'use client';

import { useEffect } from 'react';
import * as THREE from 'three';
import { waterVolumeVertexShader, waterVolumeFragmentShader } from './volumeShaders';

export type WaterVolumeConfig = {
  colorShallow: string;
  colorDeep: string;
  volumeDensity: number;
  volumeOpacity: number;
};

type WaterVolumeProps = {
  geometry: THREE.BufferGeometry;
  config: WaterVolumeConfig;
  renderOrder?: number;
};

const volumeMaterial = new THREE.ShaderMaterial({
  vertexShader: waterVolumeVertexShader,
  fragmentShader: waterVolumeFragmentShader,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  uniforms: {
    colorShallow: { value: new THREE.Color() },
    colorDeep: { value: new THREE.Color() },
    density: { value: 1.2 },
    opacity: { value: 0.45 },
  },
});

export default function WaterVolume({
  geometry,
  config,
  renderOrder = 1,
}: WaterVolumeProps) {
  useEffect(() => {
    const u = volumeMaterial.uniforms;
    (u.colorShallow.value as THREE.Color).set(config.colorShallow);
    (u.colorDeep.value as THREE.Color).set(config.colorDeep);
    u.density.value = config.volumeDensity;
    u.opacity.value = config.volumeOpacity;
  }, [config]);

  return (
    <mesh geometry={geometry} material={volumeMaterial} renderOrder={renderOrder} />
  );
}
