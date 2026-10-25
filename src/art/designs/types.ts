export interface DesignContext {
  /** Physical size of the volume in millimetres */
  W: number; H: number; T: number;
  /** Per-volume wording (year, volume number, sefer / masechta name …); meaning depends on the design */
  labels: string[];
}

export type DesignId = 'tm-hisvaaduyos' | 'tm-maamarim' | 'ls-kehot' | 'chitas' | 'shas-ozvehadar' | 'rambam' | 'ramban';

export interface ArtDesign {
  id: DesignId;
  /** Human description of the edition being recreated */
  name: string;
  /** Source blueprint the design was reconstructed from (a photograph supplied by the user; never used as a texture) */
  reference: string;
  /** Things that could not be established from the reference and were therefore approximated — flagged for verification */
  uncertain: string[];
  /** Colours for the plain surfaces of the 3D model (edges, back cover, hinge) so the whole object matches */
  bindingColor: string;
  /** Page-edge colour */
  edgeColor: string;
  cover(ctx: DesignContext): string;
  spine(ctx: DesignContext): string;
  back(ctx: DesignContext): string;
}
