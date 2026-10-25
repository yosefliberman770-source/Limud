import type { CSSProperties } from 'react';
import type { PhysicalVolume } from '@/catalogue/types';
import { shade } from './color';

export function spineCss(v: PhysicalVolume): { style: CSSProperties } {
  const b = v.colors.binding;
  return {
    style: {
      background: `linear-gradient(90deg, ${shade(b, -0.06)} 0%, ${shade(b, 0.035)} 18%, ${b} 50%, ${shade(b, -0.045)} 100%)`,
      boxShadow: `inset 1px 0 0 ${shade(b, 0.1)}55, inset -1px 0 0 #00000066, 0 0 0 0.5px #00000055`,
    },
  };
}
