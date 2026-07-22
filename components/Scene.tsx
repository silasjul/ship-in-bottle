'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'
import { useLevaStore } from '@/stores/levaStore'

function Box() {
  const ref = useRef<Mesh>(null)
  const { color, rotationSpeed, scale, wireframe } = useLevaStore((s) => s.cube)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * rotationSpeed
      ref.current.rotation.y += delta * rotationSpeed
    }
  })

  return (
    <mesh ref={ref} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} wireframe={wireframe} />
    </mesh>
  )
}

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 0, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <Box />
      <OrbitControls />
    </Canvas>
  )
}
