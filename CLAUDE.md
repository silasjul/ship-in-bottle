@AGENTS.md

# Verifying a feature

When you finish building a feature, verify it with **only** these two checks if you feel necessary:

- `npm run lint` — ESLint
- `npx tsc --noEmit` — TypeScript type-check

Never run `npm run build` or start the dev server (`npm run dev` / `npm start`) to verify your work. Ask user to check for you.

# Animation & styling

- **Animation** — prefer GSAP. Reach for it before Framer Motion, CSS animations, or hand-rolled `useFrame` tweens (per-frame 3D logic in `useFrame` is still fine).
- **Styling** — prefer Tailwind utility classes. Avoid separate CSS files or inline `style` props unless a value genuinely can't be expressed with Tailwind.

# Comments

Write as few comments as possible. Only add one when the code genuinely can't be understood without it — never restate what the code already says. Prefer clear names over explanatory comments.

# Leva tweaks

Controls are split so the panel never resets when the Canvas re-renders. Values are edited in the Leva panel (mounted beside `<Scene>`) and read back from a zustand store, so `<Scene>` can re-render freely without touching Leva.

Flow: `config → hook → LevaControls → store → consumer`

- **Config** — `configs/<name>Config.ts`. Exports a `<Name>Config` type and a `<NAME>_DEFAULTS` object.
- **Hook** — `hooks/leva/use<Name>Tweaks.ts`. Calls `useControls('<Label>', schema)` (schema values come from `<NAME>_DEFAULTS`) and mirrors the live values into the store via its setter inside a `useEffect`.
- **Store** — `stores/levaStore.ts`. One typed slice + setter per folder (`<name>` / `set<Name>`), each initialised from its `<NAME>_DEFAULTS`.
- **LevaControls** — `components/LevaControls.tsx`. Calls every folder hook and renders `<Leva />`. The only place the hooks are called.
- **Consumer** — read values anywhere in the Scene with `useLevaStore((s) => s.<name>)`.

`<LevaControls />` is mounted as a sibling of `<Scene />` in `app/page.tsx`, never inside the Canvas.

## Add a new folder (e.g. "sphere")

1. `configs/sphereConfig.ts` — a `SphereConfig` type and `SPHERE_DEFAULTS`.
2. `stores/levaStore.ts` — add `sphere: SphereConfig` + `setSphere`, initialised to `SPHERE_DEFAULTS`.
3. `hooks/leva/useSphereTweaks.ts` — copy `useCubeTweaks`, swap in the sphere config and `setSphere`.
4. `components/LevaControls.tsx` — call `useSphereTweaks()`.
5. Consume it: `const { ... } = useLevaStore((s) => s.sphere)`.
