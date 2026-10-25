import type { ArtDesign, DesignContext, DesignId } from './designs/types';
import { tmHisvaaduyos } from './designs/tmHisvaaduyos';
import { lsKehot } from './designs/lsKehot';
import { tmMaamarim } from './designs/tmMaamarim';
import { chitas } from './designs/chitas';
import { shasOzVehadar } from './designs/shasOzVehadar';
import { rambam } from './designs/rambam';
import { ramban } from './designs/ramban';

export type { ArtDesign, DesignContext, DesignId };

export const DESIGNS: Partial<Record<DesignId, ArtDesign>> = {
  'tm-hisvaaduyos': tmHisvaaduyos,
  'ls-kehot': lsKehot,
  'tm-maamarim': tmMaamarim,
  chitas,
  'shas-ozvehadar': shasOzVehadar,
  rambam,
  ramban,
};

export function getDesign(id: DesignId): ArtDesign {
  const d = DESIGNS[id];
  if (!d) throw new Error(`Unknown cover design ${id}`);
  return d;
}

export function contextFor(sizeCm: { h: number; w: number; t: number }, labels: string[]): DesignContext {
  return { W: Math.round(sizeCm.w * 100) / 10, H: Math.round(sizeCm.h * 100) / 10, T: Math.round(sizeCm.t * 100) / 10, labels };
}
