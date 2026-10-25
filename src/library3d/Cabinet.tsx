import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ShelfLayout } from './layout';
import { BOARD_T, ROW_PITCH, SHELF_INNER_WIDTH } from './layout';
import { blobShadowTexture, cavityTexture, plateTexture, woodTexture, type Quality } from './textures';

export const CAB_DEPTH = 29;
export const WALL_COLOR = '#0c111c';

export function Cabinet({ layout, quality, zSpine, castShadows }: { layout: ShelfLayout; quality: Quality; zSpine: number; castShadows: boolean }) {
  const rows = layout.rows;
  const wood = useMemo(() => woodTexture('#46301f', 21, quality), [quality]);
  const woodDark = useMemo(() => woodTexture('#2b1a10', 5, quality), [quality]);
  const cavity = useMemo(() => cavityTexture(), []);
  const blob = useMemo(() => blobShadowTexture(), []);
  const plates = useMemo(() => layout.plates.map((p) => ({ ...p, tex: plateTexture(p.he) })), [layout.plates]);
  const mWood = useMemo(() => new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62, metalness: 0.02 }), [wood]);
  const mBack = useMemo(() => new THREE.MeshStandardMaterial({ map: woodDark, roughness: 0.9, color: '#8a7a6a' }), [woodDark]);
  const mCavity = useMemo(() => new THREE.MeshBasicMaterial({ map: cavity, transparent: true, depthWrite: false }), [cavity]);
  const mBlob = useMemo(() => new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false, opacity: 0.8 }), [blob]);
  useEffect(() => () => { [wood, woodDark, cavity, blob, mWood, mBack, mCavity, mBlob, ...plates.map((p) => p.tex.map)].forEach((x) => x.dispose()); }, [wood, woodDark, cavity, blob, mWood, mBack, mCavity, mBlob, plates]);

  const topY = ROW_PITCH + BOARD_T / 2 + 0.3;
  const bottomY = -(rows - 1) * ROW_PITCH - BOARD_T / 2 - 3;
  const totalH = topY - bottomY;
  const midY = (topY + bottomY) / 2;
  const sideX = SHELF_INNER_WIDTH / 2 + 1.1;
  const boardW = SHELF_INNER_WIDTH + 4.4;
  const boardZ = zSpine + 1.4 - CAB_DEPTH / 2;

  return (
    <group>
      {/* wall */}
      <mesh position={[0, midY, zSpine - CAB_DEPTH - 6]} receiveShadow>
        <planeGeometry args={[600, 900]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={1} />
      </mesh>
      {/* cabinet back panel */}
      <mesh position={[0, midY, zSpine - CAB_DEPTH + 0.2]} material={mBack} receiveShadow>
        <planeGeometry args={[SHELF_INNER_WIDTH + 2.2, totalH]} />
      </mesh>
      {/* side panels */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * sideX, midY, boardZ]} material={mWood} castShadow={castShadows} receiveShadow>
          <boxGeometry args={[2.2, totalH, CAB_DEPTH]} />
        </mesh>
      ))}
      {/* floor board of each row */}
      {Array.from({ length: rows }, (_, r) => {
        const y = -r * ROW_PITCH;
        return (
          <group key={r}>
            <mesh position={[0, y, boardZ]} material={mWood} castShadow={castShadows} receiveShadow>
              <boxGeometry args={[boardW, BOARD_T, CAB_DEPTH]} />
            </mesh>
            <mesh position={[0, y, zSpine + 1.45]}>
              <boxGeometry args={[boardW, BOARD_T * 0.96, 0.18]} />
              <meshStandardMaterial color="#5a3d26" roughness={0.45} metalness={0.03} />
            </mesh>
            {/* soft shadow thrown on the back panel by the board above */}
            <mesh position={[0, y + ROW_PITCH - BOARD_T / 2 - 4.2, zSpine - CAB_DEPTH + 0.35]} material={mCavity}>
              <planeGeometry args={[SHELF_INNER_WIDTH + 2.2, 8.4]} />
            </mesh>
          </group>
        );
      })}
      {/* top board above row 0 */}
      <mesh position={[0, ROW_PITCH, boardZ]} material={mWood} castShadow={castShadows} receiveShadow>
        <boxGeometry args={[boardW + 1.2, BOARD_T + 0.6, CAB_DEPTH + 0.6]} />
      </mesh>
      {/* plinth */}
      <mesh position={[0, -(rows - 1) * ROW_PITCH - BOARD_T / 2 - 1.5, zSpine + 1.0]} material={mWood}>
        <boxGeometry args={[boardW + 1.2, 3, 2.4]} />
      </mesh>
      {/* contact shadows under each book */}
      {layout.placed.map((p) => (
        <mesh key={p.vol.id} rotation={[-Math.PI / 2, 0, 0]} position={[p.x, -p.row * ROW_PITCH + BOARD_T / 2 + 0.03, zSpine - p.W / 2 + 0.6]} material={mBlob} renderOrder={1}>
          <planeGeometry args={[p.T * 1.9, p.W * 1.15]} />
        </mesh>
      ))}
      {/* brass collection plates on the front lip */}
      {plates.map((p, i) => {
        const wPlate = Math.min(9, 5.6);
        return (
          <mesh key={i} position={[p.x - wPlate / 2, -p.row * ROW_PITCH + 0.0, zSpine + 1.58]}>
            <planeGeometry args={[wPlate, wPlate / p.tex.ratio]} />
            <meshStandardMaterial map={p.tex.map} metalness={0.65} roughness={0.38} />
          </mesh>
        );
      })}
    </group>
  );
}
