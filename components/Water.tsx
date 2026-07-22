'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { useLevaStore } from '@/stores/levaStore';
import { waterLevelY, bottleWorldTransform, BOTTLE_MODEL } from '@/lib/bottleDimensions';
import {
  createPlaneSlicer,
  sliceWaterCrossSection,
  setActiveCrossSection,
} from '@/lib/waterGeometry';
import { buildWaterVolume } from '@/lib/waterVolume';
import {
  getSharedWaterSimulation,
  WaterSurface,
  WaterVolume,
  type WaterSurfaceConfig,
  type WaterVolumeConfig,
} from '@/lib/water';

const DEG2RAD = Math.PI / 180;

// Only the bottle body takes part in the slice. The cap is a solid separate
// mesh sitting at the same height band as the neck bore — slicing it reads its
// outer walls as a fake cavity and extends the water out through the cap.
function findBodyMesh(root: THREE.Object3D): THREE.Mesh | null {
  root.updateMatrixWorld(true);
  let body: THREE.Mesh | null = null;
  let bodyVolume = 0;
  const box = new THREE.Box3();
  const size = new THREE.Vector3();
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    box.setFromObject(child).getSize(size);
    const volume = size.x * size.y * size.z;
    if (volume > bodyVolume) {
      bodyVolume = volume;
      body = child;
    }
  });
  return body;
}

function transformRelativeTo(
  mesh: THREE.Object3D,
  root: THREE.Object3D,
  modelTransform: THREE.Matrix4
) {
  const chain: THREE.Object3D[] = [];
  let node: THREE.Object3D | null = mesh;
  while (node && node !== root) {
    chain.push(node);
    node = node.parent;
  }
  const transform = modelTransform.clone();
  for (let i = chain.length - 1; i >= 0; i--) {
    const o = chain[i];
    transform.multiply(new THREE.Matrix4().compose(o.position, o.quaternion, o.scale));
  }
  return transform;
}

export default function Water() {
  const cfg = useLevaStore((s) => s.water);
  const bottleModel = useLevaStore((s) => s.bottle.model);
  const gl = useThree((s) => s.gl);
  const envMap = useLoader(RGBELoader, '/sky.hdr');
  const { scene } = useGLTF(BOTTLE_MODEL);

  const sim = getSharedWaterSimulation(gl);

  const bodyMesh = useMemo(() => findBodyMesh(scene), [scene]);

  const slicer = useMemo(() => {
    if (!bodyMesh) return null;
    const modelTransform = bottleWorldTransform(bottleModel);
    const transform = transformRelativeTo(bodyMesh, scene, modelTransform);
    return createPlaneSlicer([{ geometry: bodyMesh.geometry, transform }]);
  }, [scene, bodyMesh, bottleModel]);

  const fill = cfg.fill;
  const sliced = useMemo(() => {
    if (!slicer) return null;
    const waterY = waterLevelY(fill, slicer.yMin, slicer.yMax);
    const crossSection = sliceWaterCrossSection(slicer, waterY);
    if (!crossSection) return null;
    return {
      crossSection,
      volume: buildWaterVolume(slicer, crossSection, slicer.yMin),
    };
  }, [slicer, fill]);

  const crossSection = sliced?.crossSection ?? null;
  const volume = sliced?.volume ?? null;

  useEffect(() => {
    if (!crossSection) return;
    setActiveCrossSection(crossSection);
    const rows = crossSection.rows;
    let zLo = Infinity;
    let zHi = -Infinity;
    for (const row of rows) {
      zLo = Math.min(zLo, row.zLo);
      zHi = Math.max(zHi, row.zHi);
    }
    sim.setBounds({
      centerX: (crossSection.xMin + crossSection.xMax) / 2,
      centerZ: (zLo + zHi) / 2,
      halfWidth: Math.max((crossSection.xMax - crossSection.xMin) / 2, 1e-3),
      halfLength: Math.max((zHi - zLo) / 2, 1e-3),
    });
    return () => {
      setActiveCrossSection(null);
      crossSection.geometry.dispose();
    };
  }, [sim, crossSection]);

  useEffect(() => {
    if (!volume) return;
    return () => volume.dispose();
  }, [volume]);

  const surfaceConfig = useMemo<WaterSurfaceConfig>(() => {
    const el = cfg.sunElevation * DEG2RAD;
    const az = cfg.sunAzimuth * DEG2RAD;
    return {
      edgeFade: cfg.edgeFade,
      opacity: cfg.opacity,
      simSpeed: cfg.simSpeed,
      damping: cfg.damping,
      rainRate: cfg.rainRate,
      dropRadius: cfg.dropRadius,
      dropStrength: cfg.dropStrength,
      colorShallow: cfg.colorShallow,
      colorDeep: cfg.colorDeep,
      depthFalloff: cfg.depthFalloff,
      sunColor: cfg.sunColor,
      sunDirection: new THREE.Vector3(
        Math.cos(el) * Math.cos(az),
        Math.sin(el),
        Math.cos(el) * Math.sin(az)
      ),
      fresnelF0: cfg.fresnelF0,
      fresnelPower: cfg.fresnelPower,
      reflectivity: cfg.reflectivity,
      sunGlint: cfg.sunGlint,
      shininess: cfg.shininess,
    };
  }, [cfg]);

  const volumeConfig = useMemo<WaterVolumeConfig>(
    () => ({
      colorShallow: cfg.colorShallow,
      colorDeep: cfg.colorDeep,
      volumeDensity: cfg.volumeDensity,
      volumeOpacity: cfg.volumeOpacity,
    }),
    [cfg]
  );

  if (!crossSection) return null;

  return (
    <group position={[0, crossSection.waterY, 0]}>
      {volume && <WaterVolume geometry={volume} config={volumeConfig} />}
      <WaterSurface
        sim={sim}
        geometry={crossSection.geometry}
        envMap={envMap}
        config={surfaceConfig}
      />
    </group>
  );
}
