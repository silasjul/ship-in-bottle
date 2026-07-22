'use client';

import { useEffect, useState } from 'react';
import { Leva } from 'leva';
import { useBottleTweaks } from '@/hooks/leva/useBottleTweaks';
import { useShipTweaks } from '@/hooks/leva/useShipTweaks';
import { useWaterTweaks } from '@/hooks/leva/useWaterTweaks';
import { useRenderTweaks } from '@/hooks/leva/useRenderTweaks';
import { useAtmosphereTweaks } from '@/hooks/leva/useAtmosphereTweaks';
import { useEffectsTweaks } from '@/hooks/leva/useEffectsTweaks';
import { useLogButton } from '@/hooks/leva/useLogButton';
import { useCameraButton } from '@/hooks/leva/useCameraButton';

export default function LevaControls() {
  useBottleTweaks();
  useShipTweaks();
  useWaterTweaks();
  useRenderTweaks();
  useAtmosphereTweaks();
  useEffectsTweaks();
  useLogButton();
  useCameraButton();

  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'h') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      setHidden((prev) => !prev);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return <Leva hidden={hidden} />;
}
