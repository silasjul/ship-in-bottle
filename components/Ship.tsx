'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useLevaStore } from '@/stores/levaStore';
import { getActiveCrossSection, clampToCrossSection } from '@/lib/waterGeometry';
import { getSharedWaterSimulation } from '@/lib/water';

const DEG2RAD = Math.PI / 180;

const bowCenter = new THREE.Vector3();
const sternCenter = new THREE.Vector3();
const dragPoint = new THREE.Vector3();

// Module-scope mutation helpers: the react-hooks lint forbids modifying
// hook-returned values inside the component body.
function setControlsEnabled(controls: { enabled: boolean } | null, enabled: boolean) {
  if (controls) controls.enabled = enabled;
}

function setCursor(cursor: string) {
  document.body.style.cursor = cursor;
}

export default function Ship() {
  const cfg = useLevaStore((s) => s.ship);
  const waterCfg = useLevaStore((s) => s.water);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null;
  const groupRef = useRef<THREE.Group>(null);
  const wakeDebugRef = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector2(cfg.position.x, cfg.position.z));
  const spawned = useRef(false);
  const lastCfgPosition = useRef({ x: cfg.position.x, z: cfg.position.z });
  const prevBow = useRef(new THREE.Vector3());
  const prevStern = useRef(new THREE.Vector3());
  const wakeInitialized = useRef(false);
  const dragging = useRef(false);
  const { scene } = useGLTF('/viking_ship.glb');

  const sim = getSharedWaterSimulation(gl);

  const clampPosition = () => {
    const cs = getActiveCrossSection();
    if (!cs) return;
    const [x, z] = clampToCrossSection(
      cs,
      position.current.x,
      position.current.y,
      1.5 * cfg.scale,
      0.7 * cfg.scale
    );
    position.current.set(x, z);
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    setControlsEnabled(controls, false);
    setCursor('grabbing');
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    const group = groupRef.current;
    if (!group?.parent) return;

    group.getWorldPosition(dragPoint);
    const planeY = dragPoint.y;
    const { origin, direction } = e.ray;
    if (Math.abs(direction.y) < 1e-4) return;
    const t = (planeY - origin.y) / direction.y;
    if (t < 0) return;

    dragPoint.copy(origin).addScaledVector(direction, t);
    group.parent.worldToLocal(dragPoint);
    position.current.set(dragPoint.x, dragPoint.z);
    clampPosition();
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!dragging.current) return;
    dragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setControlsEnabled(controls, true);
    setCursor('grab');
  };

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const cs = getActiveCrossSection();
    if (!cs) return;

    // Leva position is an offset from the cavity center; edits there snap the
    // ship back.
    if (
      !spawned.current ||
      cfg.position.x !== lastCfgPosition.current.x ||
      cfg.position.z !== lastCfgPosition.current.z
    ) {
      spawned.current = true;
      lastCfgPosition.current = { x: cfg.position.x, z: cfg.position.z };
      position.current.set(
        cs.centerX + cfg.position.x,
        cs.centerZ + cfg.position.z
      );
    }
    clampPosition();

    const t = state.clock.elapsedTime;
    const heading = cfg.rotation.y * DEG2RAD;
    const waterY = cs.waterY;
    const sx = position.current.x;
    const sz = position.current.y;

    let targetY = waterY + cfg.position.y;
    let targetPitch = 0;
    let targetRoll = 0;

    const d = 1.7 * cfg.scale;
    const ds = 0.7 * cfg.scale;
    const bowX = Math.cos(heading) * d;
    const bowZ = -Math.sin(heading) * d;
    const sideX = Math.sin(heading) * ds;
    const sideZ = Math.cos(heading) * ds;

    if (cfg.buoyancy && sim.ready) {
      const [hBow, hStern, hStarboard, hPort] = sim.readHeights([
        [sx + bowX, sz + bowZ],
        [sx - bowX, sz - bowZ],
        [sx + sideX, sz + sideZ],
        [sx - sideX, sz - sideZ],
      ]);

      targetY += (hBow + hStern + hStarboard + hPort) / 4;
      targetPitch = Math.atan2(hBow - hStern, 2 * d);
      targetRoll = -Math.atan2(hStarboard - hPort, 2 * ds) * 0.7;
    }

    group.position.x = sx;
    group.position.z = sz;
    group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 6, delta);
    group.rotation.order = 'YXZ';
    group.rotation.y = heading + Math.sin(t * 0.31) * 0.015;
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetRoll, 5, delta);
    group.rotation.z = THREE.MathUtils.damp(group.rotation.z, targetPitch, 5, delta);

    const hullRadius = cfg.wakeRadius * cfg.scale;
    const halfLength = cfg.wakeLength * 0.5 * cfg.scale;
    const hullY = group.position.y - waterY + cfg.wakeYOffset * cfg.scale;
    const wakeHeading = heading + cfg.wakeYaw * DEG2RAD;
    const alongX = Math.cos(wakeHeading) * halfLength;
    const alongZ = -Math.sin(wakeHeading) * halfLength;
    bowCenter.set(sx + alongX, hullY, sz + alongZ);
    sternCenter.set(sx - alongX, hullY, sz - alongZ);

    const wakeDebug = wakeDebugRef.current;
    if (wakeDebug) {
      wakeDebug.position.set(sx, waterY + hullY, sz);
      wakeDebug.rotation.y = wakeHeading;
    }

    if (sim.ready && waterCfg.wakeStrength > 0) {
      if (wakeInitialized.current) {
        sim.moveCapsule(
          prevBow.current,
          prevStern.current,
          bowCenter,
          sternCenter,
          hullRadius,
          waterCfg.wakeStrength
        );
      }
      prevBow.current.copy(bowCenter);
      prevStern.current.copy(sternCenter);
      wakeInitialized.current = true;
    }
  });

  return (
    <>
      {cfg.showWake && (
        <group ref={wakeDebugRef}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry
              args={[cfg.wakeRadius * cfg.scale, cfg.wakeLength * cfg.scale, 6, 16]}
            />
            <meshBasicMaterial wireframe color="#00ff88" transparent opacity={0.5} depthTest={false} />
          </mesh>
        </group>
      )}
      <group ref={groupRef}>
        <group
          scale={cfg.scale}
          rotation={[cfg.rotation.x * DEG2RAD, 0, cfg.rotation.z * DEG2RAD]}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerOver={() => {
            if (!dragging.current) setCursor('grab');
          }}
          onPointerOut={() => {
            if (!dragging.current) setCursor('auto');
          }}
        >
          <primitive object={scene} />
        </group>
      </group>
    </>
  );
}

useGLTF.preload('/viking_ship.glb');
