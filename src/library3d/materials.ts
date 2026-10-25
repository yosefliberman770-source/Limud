import type { PhysicalVolume } from '@/catalogue/types';

/** PBR parameters per binding material (kept cheap: MeshStandardMaterial only). */
export function bindingMaterialProps(m: PhysicalVolume['material']): { roughness: number; metalness: number } {
  switch (m) {
    case 'leather': return { roughness: 0.62, metalness: 0.02 };
    case 'leatherette': return { roughness: 0.55, metalness: 0.03 };
    case 'cloth': return { roughness: 0.92, metalness: 0 };
    default: return { roughness: 0.85, metalness: 0 };
  }
}
