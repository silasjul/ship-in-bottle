'use client';

import { useEffect, useState } from 'react';
import { Leva } from 'leva';
import { useCubeTweaks } from '@/hooks/leva/useCubeTweaks';
import { useLogButton } from '@/hooks/leva/useLogButton';

export default function LevaControls() {
  useCubeTweaks();
  useLogButton();

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
