import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ShelfLayout, Placed } from './layout';
import { ROW_PITCH, SHELF_INNER_WIDTH } from './layout';
import { distanceForHeight, distanceForWidth } from './pose';
import { Cabinet, WALL_COLOR } from './Cabinet';
import { BookObject } from './BookObject';
import type { Anim } from './useBookController';
import type { Quality } from './textures';

export const FOV = 32;
export const Z_SPINE = 0;

export interface Framing {
  distance: number;
  visibleH: number;
  visibleW: number;
  topY: number;
  contentH: number;
  maxScrollCm: number;
}

export function computeFraming(aspect: number, rows: number): Framing {
  const fitW = distanceForWidth(SHELF_INNER_WIDTH + 6, 1, FOV, aspect);
  const fitH = distanceForHeight(ROW_PITCH * 1.9, 1, FOV);
  const distance = Math.max(fitW, fitH);
  const visibleH = 2 * distance * Math.tan((FOV * Math.PI) / 360);
  const visibleW = visibleH * aspect;
  const topY = ROW_PITCH + 3;
  const contentH = rows * ROW_PITCH + 8;
  return { distance, visibleH, visibleW, topY, contentH, maxScrollCm: Math.max(0, contentH - visibleH) };
}

export interface SceneProps {
  layout: ShelfLayout;
  quality: Quality;
  anim: Anim;
  scrollRef: { current: number };
  dueIds: Set<string>;
  interactive: boolean;
  onPressStart: (id: string) => void;
  onPressEnd: () => void;
  onActivate: (id: string) => void;
  invalidateRef: { current: (() => void) | null };
  framingRef: { current: Framing | null };
}

export function LibraryScene({ layout, quality, anim, scrollRef, dueIds, interactive, onPressStart, onPressEnd, onActivate, invalidateRef, framingRef }: SceneProps) {
  const { camera, size, scene, invalidate, gl } = useThree();
  const aspect = size.width / Math.max(1, size.height);
  const framing = useMemo(() => computeFraming(aspect, layout.rows), [aspect, layout.rows]);
  framingRef.current = framing;
  const castShadows = quality === 'high';
  const hemi = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const camY = useRef(0);

  // QA only (?qa): renderer statistics for the profiling script
  useEffect(() => {
    if (!/[?&]qa\b/.test(location.search)) return;
    (window as unknown as { __seder_stats: () => unknown }).__seder_stats = () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, frame: gl.info.render.frame, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0, meshes: (() => { let n = 0, v = 0; scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) { n++; if (o.visible) v++; } }); return [n, v]; })(), camY: camera.position.y });
  }, [gl, scene, camera]);
  useEffect(() => { invalidateRef.current = invalidate; return () => { invalidateRef.current = null; }; }, [invalidate, invalidateRef]);
  useEffect(() => {
    scene.background = new THREE.Color(WALL_COLOR);
    scene.fog = new THREE.Fog(WALL_COLOR, 400, 900);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.12;
    invalidate();
  }, [scene, gl, invalidate]);
  useEffect(() => { invalidate(); }, [framing, size.width, size.height, quality, invalidate]);

  const yFor = (scrollPx: number) => {
    const pxPerCm = size.height / framing.visibleH;
    const scrollCm = Math.min(framing.maxScrollCm, Math.max(0, scrollPx / pxPerCm));
    return framing.topY - framing.visibleH / 2 - scrollCm;
  };

  // Present point is resolved lazily from the current camera framing.
  const getPresent = useMemo(() => (pl: Placed) => {
    const cam = Z_SPINE + framing.distance;
    const dPresent = Math.max(distanceForHeight(pl.H, 0.5, FOV), pl.H * 2.3);
    const dFinal = Math.min(dPresent, Math.max(distanceForWidth(pl.W * 1.06, 1, FOV, aspect), pl.H * 1.6));
    return { x: 0, y: camY.current, z: cam - dPresent, dollyZ: Math.max(0, dPresent - dFinal) };
  }, [framing, aspect]);

  useFrame(() => {
    // Camera follows native scroll; while a book is out the scroll position is frozen.
    if (anim.activeId === null) camY.current = yFor(scrollRef.current);
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = FOV;
    cam.position.set(0, camY.current, Z_SPINE + framing.distance);
    cam.lookAt(0, camY.current, Z_SPINE);
    cam.near = 5; cam.far = 1200;
    cam.updateProjectionMatrix();
    // Dim and haze the room while a book is presented (cheap stand-in for depth of field).
    const dim = Math.min(1, anim.activeId ? anim.p / 2 : 0);
    const eased = 1 - Math.pow(1 - dim, 3);
    if (hemi.current) hemi.current.intensity = 0.9 * (1 - 0.7 * eased);
    if (key.current) {
      key.current.intensity = 2.1 * (1 - 0.62 * eased);
      key.current.position.set(-26, camY.current + 36, Z_SPINE + 90);
      key.current.target.position.set(0, camY.current, Z_SPINE - 10);
      key.current.target.updateMatrixWorld();
    }
    if (fill.current) {
      fill.current.intensity = 5200 * eased;
      fill.current.position.set(10, camY.current + 12, Z_SPINE + framing.distance - 30);
    }
    const fog = scene.fog as THREE.Fog | null;
    if (fog) { fog.near = 400 - 300 * eased; fog.far = 900 - 560 * eased; }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#ffe8c8', '#2a1a10', 0.9]} />
      <directionalLight ref={key} color="#ffd8a6" intensity={2.1} castShadow={castShadows} shadow-mapSize={[1024, 1024]} shadow-camera-left={-34} shadow-camera-right={34} shadow-camera-top={44} shadow-camera-bottom={-44} shadow-camera-near={10} shadow-camera-far={260} shadow-bias={-0.0004} />
      <primitive object={key.current?.target ?? new THREE.Object3D()} />
      <pointLight ref={fill} color="#ffe2b8" intensity={0} distance={260} decay={2} />
      <Cabinet layout={layout} quality={quality} zSpine={Z_SPINE} castShadows={castShadows} />
      {layout.placed.map((pl) => (
        <BookObject key={pl.vol.id} placed={pl} quality={quality} zSpine={Z_SPINE} anim={anim} getPresent={getPresent} due={dueIds.has(pl.vol.id)} onPressStart={onPressStart} onPressEnd={onPressEnd} onActivate={onActivate} castShadows={castShadows} interactive={interactive} />
      ))}
    </>
  );
}
