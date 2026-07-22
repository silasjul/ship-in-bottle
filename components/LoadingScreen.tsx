'use client';

import { useRef } from 'react';
import { Pirata_One, IM_Fell_English } from 'next/font/google';
import { useLoader } from '@react-three/fiber';
import { useGLTF, useProgress } from '@react-three/drei';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BOTTLE_MODEL } from '@/lib/bottleDimensions';

useGLTF.preload(BOTTLE_MODEL);
useGLTF.preload('/viking_ship.glb');
useLoader.preload(RGBELoader, '/sky.hdr');

const pirata = Pirata_One({ weight: '400', subsets: ['latin'] });
const fell = IM_Fell_English({
  weight: '400',
  style: 'italic',
  subsets: ['latin'],
});

function ShipGlyph() {
  return (
    <svg viewBox="0 0 64 48" className="h-8 w-10 fill-[#c9a25e]">
      <path d="M32 2 L44 5.5 L32 9 Z" />
      <rect x="31" y="6" width="2" height="24" />
      <path d="M18 9 H46 L42 25 H22 Z" />
      <path d="M4 30 C14 34 50 34 60 30 C58 38 46 42 32 42 C18 42 6 38 4 30 Z" />
    </svg>
  );
}

export default function LoadingScreen() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const shipRef = useRef<HTMLDivElement>(null);
  const { active, progress } = useProgress();
  const done = !active && progress === 100;

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(shipRef.current, {
        y: -3,
        rotation: -5,
        transformOrigin: '50% 100%',
        duration: 1.3,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    });
  });

  useGSAP(
    () => {
      if (!done) return;
      gsap.to(overlayRef.current, { autoAlpha: 0, duration: 1, delay: 0.3 });
    },
    { dependencies: [done] }
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 overflow-hidden bg-[#05070a]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0b1322_0%,#05070a_70%)]" />

      <h1
        className={`${pirata.className} relative text-5xl text-[#c9a25e] drop-shadow-[0_0_28px_rgba(201,162,94,0.25)] md:text-7xl`}
      >
        Ship in a Bottle
      </h1>

      <div className="relative h-12 w-72 md:w-104">
        <div className="absolute bottom-2 left-0 right-4 border-t-2 border-dashed border-[#e8dcc0]/25" />
        <span
          className={`${pirata.className} absolute -bottom-0.5 right-0 text-xl text-[#c9a25e]`}
        >
          X
        </span>
        <div
          className="absolute bottom-1.5 -translate-x-1/2 transition-[left] duration-500 ease-out"
          style={{ left: `${progress}%` }}
        >
          <div ref={shipRef}>
            <ShipGlyph />
          </div>
        </div>
      </div>

      <p className={`${fell.className} relative text-lg text-[#e8dcc0]/70`}>
        Charting a course &middot; {Math.round(progress)}%
      </p>
    </div>
  );
}
