import * as THREE from 'three';
import type { BottleModelTransform } from '@/configs/bottleConfig';

export const BOTTLE_MODEL = '/plastic_bottle.glb';

const DEG2RAD = Math.PI / 180;

/** Transform applied to the bottle model, mirrored by the water slicer. */
export function bottleWorldTransform(model: BottleModelTransform) {
  const rotation = new THREE.Euler(
    model.rotation.x * DEG2RAD,
    model.rotation.y * DEG2RAD,
    model.rotation.z * DEG2RAD
  );
  return new THREE.Matrix4().compose(
    new THREE.Vector3(model.position.x, model.position.y, model.position.z),
    new THREE.Quaternion().setFromEuler(rotation),
    new THREE.Vector3(model.scale, model.scale, model.scale)
  );
}

/** Water plane height for a fill fraction of the cavity's measured y-extent. */
export function waterLevelY(fill: number, yMin: number, yMax: number) {
  return THREE.MathUtils.lerp(
    yMin,
    yMax,
    THREE.MathUtils.clamp(fill, 0.05, 0.95)
  );
}
