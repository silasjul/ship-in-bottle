'use client';

import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import { useLevaStore } from '@/stores/levaStore';

export default function Effects() {
  const cfg = useLevaStore((s) => s.effects);

  if (!cfg.enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={cfg.bloom}
        luminanceThreshold={cfg.bloomThreshold}
        luminanceSmoothing={0.25}
        radius={0.75}
      />
      {/* Replaces the renderer's Reinhard pass, which the composer disables.
          Still driven by gl.toneMappingExposure, so the exposure tweak works. */}
      <ToneMapping mode={ToneMappingMode.REINHARD} />
      <ChromaticAberration
        offset={[cfg.fringe, cfg.fringe]}
        radialModulation
        modulationOffset={0.4}
      />
      <Noise premultiply blendFunction={BlendFunction.ADD} opacity={cfg.grain} />
      <Vignette offset={cfg.vignetteOffset} darkness={cfg.vignette} />
    </EffectComposer>
  );
}
