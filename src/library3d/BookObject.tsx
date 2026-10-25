import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Placed } from './layout';
import { homeCenter, ROW_PITCH } from './layout';
import { poseAt, folioAngle, FOLIO_COUNT, type Stage } from './pose';
import { bindingMaterialProps } from './materials';
import { sharedGeos, sharedMaterials } from './shared';
import type { Quality } from './textures';
import { artTexture } from './artTextures';
import { getDesign } from '@/art';

export interface BookObjectProps {
  placed: Placed;
  quality: Quality;
  zSpine: number;
  /** Mutable animation clock shared with the controller. */
  anim: { p: number; activeId: string | null; pressedId: string | null };
  /** Stage (present point) resolver; evaluated lazily so camera changes are honoured. */
  getPresent: (placed: Placed) => { x: number; y: number; z: number; dollyZ: number };
  due: boolean;
  /** Pulled slightly forward when something is due. */
  onPressStart: (id: string) => void;
  onPressEnd: () => void;
  onActivate: (id: string) => void;
  castShadows: boolean;
  /** Tap handling is disabled while a book is out. */
  interactive: boolean;
}

const COVER_T = 0.32;

function BookObjectInner({ placed, quality, zSpine, anim, getPresent, due, onPressStart, onPressEnd, onActivate, castShadows, interactive }: BookObjectProps) {
  const { vol, W, H, T } = placed;
  const home = useMemo(() => {
    const h = homeCenter(placed, zSpine);
    return due ? { ...h, z: h.z + 0.9 } : h;
  }, [placed, zSpine, due]);
  const { invalidate, camera } = useThree();
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const folioGroup = useRef<THREE.Group>(null);
  const folios = useRef<(THREE.Group | null)[]>([]);
  const wasActive = useRef(false);
  const wasPressed = useRef(false);

  // Per-book state is only the three materials whose maps change (spine / cover / back art); everything else is shared across books.
  const assets = useMemo(() => {
    const dz = vol.design ? getDesign(vol.design.id) : null;
    const binding = dz?.bindingColor ?? vol.colors.binding;
    const sh = sharedMaterials(vol, binding, dz?.edgeColor);
    const bp = bindingMaterialProps(vol.material);
    // flat binding colour until the vector art arrives (no per-book canvas)
    const mSpine = new THREE.MeshStandardMaterial({ color: binding, ...bp });
    const mCover = new THREE.MeshStandardMaterial({ color: binding, ...bp });
    const mBack = new THREE.MeshStandardMaterial({ color: binding, ...bp });
    const geos = sharedGeos(W, H, T, COVER_T);
    return { mSpine, mCover, mBack, mPlain: sh.plain, mEndpaper: sh.endpaper, mEdge: sh.edge, mLog: sh.log, mFolio: sh.folio, geos };
  }, [vol, W, H, T]);

  useEffect(() => () => { assets.mSpine.dispose(); assets.mCover.dispose(); assets.mBack.dispose(); }, [assets]);

  // Swap in the vector-art textures: the spine as soon as the queue gets to it, the cover and back the first time the book is touched.
  // (The procedural textures stay as the instant placeholder / fallback.)
  const base = import.meta.env.BASE_URL ?? '/';
  const art = useRef<{ spine: THREE.Texture | null; cover: THREE.Texture | null; back: THREE.Texture | null; faces: { cover: boolean; back: boolean }; spineRequested: boolean; cancelled: boolean }>({ spine: null, cover: null, back: null, faces: { cover: false, back: false }, spineRequested: false, cancelled: false });
  const loadFace = (face: 'cover' | 'back') => {
    const a = art.current;
    if (a.faces[face] || !vol.design) return;
    a.faces[face] = true;
    void artTexture(vol, face, quality, base).then((t) => {
      if (a.cancelled) { t.dispose(); return; }
      const mat = face === 'cover' ? assets.mCover : assets.mBack;
      a[face] = t; mat.color.set('#ffffff'); mat.map = t; mat.needsUpdate = true; invalidate();
    }).catch((e) => { a.faces[face] = false; console.warn('[books] art unavailable', vol.id, face, e); });
  };
  const loadFull = () => { loadFace('cover'); loadFace('back'); };

  const requestSpine = () => {
    const a = art.current;
    if (a.spineRequested || !vol.design) return;
    a.spineRequested = true;
    void artTexture(vol, 'spine', quality, base).then((t) => {
      if (a.cancelled) { t.dispose(); return; }
      a.spine = t; assets.mSpine.color.set('#ffffff'); assets.mSpine.map = t; assets.mSpine.needsUpdate = true; invalidate();
      // books on screen are the likeliest to be opened: warm their cover while the device is idle so opening feels instant
      const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 400));
      idle(() => { if (!a.cancelled && Math.abs(home.y - camera.position.y) < ROW_PITCH * 1.2) loadFace('cover'); });
    }).catch((e) => { a.spineRequested = false; console.warn('[books] spine art unavailable', vol.id, e); });
  };
  useEffect(() => {
    const a: typeof art.current = { spine: null, cover: null, back: null, faces: { cover: false, back: false }, spineRequested: false, cancelled: false };
    art.current = a;
    invalidate(); // let the first frame decide which spines are near the viewport
    return () => { a.cancelled = true; a.spine?.dispose(); a.cover?.dispose(); a.back?.dispose(); };
  }, [vol, quality, assets, base, invalidate]);

  // Compact material arrays (one entry per face group — see groupedBox in shared.ts)
  const spineMats = useMemo(() => [assets.mSpine, assets.mPlain], [assets]);
  const pageMats = useMemo(() => [assets.mEdge, assets.mLog, assets.mEndpaper], [assets]);
  const coverMats = useMemo(() => [assets.mPlain, assets.mCover, assets.mEndpaper], [assets]);
  const backMats = useMemo(() => [assets.mPlain, assets.mEndpaper, assets.mBack], [assets]);

  const apply = (p: number) => {
    const g = root.current;
    if (!g) return;
    const present = getPresent(placed);
    const stage: Stage = { home, dims: { W, H, T }, present: { x: present.x, y: present.y, z: present.z } };
    const pose = poseAt(p, stage);
    const press = p <= 0.0001 && anim.pressedId === vol.id ? 0.45 : 0;
    g.position.set(pose.position.x, pose.position.y + press * 0.4, pose.position.z + present.dollyZ * pose.open + press);
    g.rotation.set(pose.rotX, pose.rotY, 0, 'YXZ');
    if (hinge.current) hinge.current.rotation.y = pose.cover;
    if (folioGroup.current) folioGroup.current.visible = pose.fan > 0.001;
    folios.current.forEach((f, i) => { if (f) f.rotation.y = folioAngle(i, pose.fan); });
  };

  // initial placement at the shelf
  useEffect(() => { apply(0); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [home, W, H, T]);

  useFrame(() => {
    const active = anim.activeId === vol.id;
    const pressed = anim.pressedId === vol.id;
    if (active || pressed) loadFull();
    // load the spine art only for books near the viewport (two rows either side), so a 90-book shelf never rasterises everything at once
    if (!art.current.spineRequested && Math.abs(home.y - camera.position.y) < ROW_PITCH * 2.2) requestSpine();
    if (active) { apply(anim.p); wasActive.current = true; }
    else if (wasActive.current) { apply(0); wasActive.current = false; }
    else if (pressed !== wasPressed.current) { apply(0); }
    wasPressed.current = pressed;
  });

  const pressed = useRef(false);
  const handlers = interactive
    ? {
        onPointerDown: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); pressed.current = true; onPressStart(vol.id); },
        onPointerUp: () => { if (pressed.current) { pressed.current = false; onPressEnd(); } },
        onPointerOut: () => { if (pressed.current) { pressed.current = false; onPressEnd(); } },
        onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onActivate(vol.id); },
      }
    : {};

  return (
    <group ref={root} name={`book:${vol.id}`} {...handlers}>
      {/* back cover (outside faces -z) */}
      <mesh geometry={assets.geos.back} material={backMats} position={[0, 0, -T / 2 + COVER_T / 2]} castShadow={castShadows} receiveShadow />
      {/* spine, +x side */}
      <mesh geometry={assets.geos.spine} material={spineMats} position={[W / 2 - COVER_T / 2, 0, 0]} castShadow={castShadows} />
      {/* page block */}
      <mesh geometry={assets.geos.pages} material={pageMats} position={[-0.12, 0, 0]} />
      {/* folios hinged at the spine, hidden until the fan starts */}
      <group ref={folioGroup} visible={false}>
        {Array.from({ length: FOLIO_COUNT }, (_, i) => (
          <group key={i} ref={(el) => { folios.current[i] = el; }} position={[W / 2 - COVER_T - 0.25, 0, T / 2 - COVER_T - 0.07 - i * 0.045]}>
            <mesh geometry={assets.geos.folio} material={assets.mFolio} position={[-(W - 0.7) / 2, 0, 0]} />
          </group>
        ))}
      </group>
      {/* front cover, hinged at the spine edge (right) */}
      <group ref={hinge} position={[W / 2, 0, T / 2 - COVER_T / 2]}>
        <mesh geometry={assets.geos.cover} material={coverMats} position={[-W / 2, 0, 0]} castShadow={castShadows} />
      </group>
      {due && (
        <group position={[W / 2 + 0.05, H / 2 - 2.6, 0]}>
          {/* a brass clip marking "learn today" — sits proud of the spine */}
          <mesh castShadow={castShadows}>
            <boxGeometry args={[0.22, 0.7, T * 0.78]} />
            <meshStandardMaterial color="#c9a86a" metalness={0.75} roughness={0.32} />
          </mesh>
          <mesh position={[0.06, -0.55, 0]}>
            <boxGeometry args={[0.1, 0.5, T * 0.34]} />
            <meshStandardMaterial color="#8d1f2b" roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export const BookObject = memo(BookObjectInner);
