'use client';

import { useGLTF } from '@react-three/drei';
import { useLevaStore } from '@/stores/levaStore';
import { BOTTLE_MODEL } from '@/lib/bottleDimensions';

export default function Bottle() {
  const model = useLevaStore((s) => s.bottle.model);
  const { scene } = useGLTF(BOTTLE_MODEL);

  const DEG2RAD = Math.PI / 180;
  return (
    <primitive
      object={scene}
      position={[model.position.x, model.position.y, model.position.z]}
      rotation={[
        model.rotation.x * DEG2RAD,
        model.rotation.y * DEG2RAD,
        model.rotation.z * DEG2RAD,
      ]}
      scale={model.scale}
    />
  );
}

useGLTF.preload(BOTTLE_MODEL);
