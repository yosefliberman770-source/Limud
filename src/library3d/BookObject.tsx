import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Placed } from './layout';
import { homeCenter } from './layout';
import { poseAt, folioAngle, FOLIO_COUNT, type Stage } from './pose';
import { bindingMaterialProps } from './materials';
import { coverTexture, spineTexture, paperTexture, pageEdgeTexture, plainBinding, loadScanTextures, type Quality } from './textures';

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
  const { invalidate } = useThree();
  const root = useRef<THREE.Group>(null);
  const hinge = useRef<THREE.Group>(null);
  const folioGroup = useRef<THREE.Group>(null);
  const folios = useRef<(THREE.Group | null)[]>([]);
  const wasActive = useRef(false);
  const wasPressed = useRef(false);

  const assets = useMemo(() => {
    const spine = spineTexture(vol, quality);
    const cover = coverTexture(vol, quality);
    const back = plainBinding(vol, 128, 192, 'back');
    const plain = plainBinding(vol, 64, 64, 'edge');
    const endpaper = paperTexture({ w: 256, h: 384, seed: 3, warm: '#efe5cc' });
    const logPage = paperTexture({ w: 256, h: 384, ruled: true, seed: 11 });
    const edge = pageEdgeTexture();
    const bp = bindingMaterialProps(vol.material);
    const mSpine = new THREE.MeshStandardMaterial({ map: spine, ...bp });
    const mPlain = new THREE.MeshStandardMaterial({ map: plain, ...bp });
    const mBack = new THREE.MeshStandardMaterial({ map: back, ...bp });
    const mCover = new THREE.MeshStandardMaterial({ map: cover, ...bp });
    const mEndpaper = new THREE.MeshStandardMaterial({ map: endpaper, roughness: 0.95 });
    const mEdge = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.95 });
    const mLog = new THREE.MeshStandardMaterial({ map: logPage, roughness: 0.95 });
    const mFolio = new THREE.MeshStandardMaterial({ map: logPage, roughness: 0.95, side: THREE.DoubleSide });
    const geos = {
      back: new THREE.BoxGeometry(W, H, COVER_T),
      spine: new THREE.BoxGeometry(COVER_T, H, T),
      pages: new THREE.BoxGeometry(W - 0.55, H - 0.6, T - COVER_T * 2 - 0.04),
      cover: new THREE.BoxGeometry(W, H, COVER_T),
      folio: new THREE.PlaneGeometry(W - 0.7, H - 0.9),
    };
    return { spine, cover, back, plain, endpaper, logPage, edge, mSpine, mPlain, mBack, mCover, mEndpaper, mEdge, mLog, mFolio, geos };
  }, [vol, quality, W, H, T]);

  useEffect(() => () => {
    const a = assets;
    [a.spine, a.cover, a.back, a.plain, a.endpaper, a.logPage, a.edge, a.mSpine, a.mPlain, a.mBack, a.mCover, a.mEndpaper, a.mEdge, a.mLog, a.mFolio, ...Object.values(a.geos)].forEach((x) => x.dispose());
  }, [assets]);

  // Swap in the real-photo textures once loaded (procedural ones remain as the instant placeholder / fallback).
  useEffect(() => {
    if (!vol.scan) return;
    let cancelled = false;
    let loaded: { cover: THREE.Texture; spine: THREE.Texture } | null = null;
    void loadScanTextures(vol, quality, import.meta.env.BASE_URL ?? '/').then((t) => {
      if (cancelled || !t) { t?.cover.dispose(); t?.spine.dispose(); return; }
      loaded = t;
      assets.mCover.map = t.cover; assets.mCover.needsUpdate = true;
      assets.mSpine.map = t.spine; assets.mSpine.needsUpdate = true;
      invalidate();
    });
    return () => { cancelled = true; loaded?.cover.dispose(); loaded?.spine.dispose(); };
  }, [vol, quality, assets, invalidate]);

  // Materials arrays per box face order: +x, -x, +y, -y, +z, -z
  const spineMats = useMemo(() => [assets.mSpine, assets.mPlain, assets.mPlain, assets.mPlain, assets.mPlain, assets.mPlain], [assets]);
  const pageMats = useMemo(() => [assets.mEdge, assets.mEdge, assets.mEdge, assets.mEdge, assets.mLog, assets.mEndpaper], [assets]);
  const coverMats = useMemo(() => [assets.mPlain, assets.mPlain, assets.mPlain, assets.mPlain, assets.mCover, assets.mEndpaper], [assets]);
  const backMats = useMemo(() => [assets.mPlain, assets.mPlain, assets.mPlain, assets.mPlain, assets.mEndpaper, assets.mBack], [assets]);

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
