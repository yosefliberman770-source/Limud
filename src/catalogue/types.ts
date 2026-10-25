import type { DesignId } from '../art/designs/types';
import type { Verification } from '@/shiurim/types';
import type { Occasion } from '@/calendar/occasion';

export interface SourceRef {
  id: string;
  url: string;
  title: string;
  accessedAt: string;
  notes?: string;
}

/* ---------- Toras Menachem ---------- */
export interface TmVolume {
  id: string; // tm-5710-01
  heTitle: string;
  year: number; // 5710 / 5711
  volumeNumber: number;
  pageCount: number | null;
  sourceIds: string[];
  verification: Verification;
}

export interface TmGathering {
  id: string;
  volumeId: string;
  ordinal: number;
  heDate: string;
  hebrewYear: number;
  hebrewMonth: string;
  hebrewDay: number;
  occasion: { type: Occasion['type']; parsha: string | null; festival: string | null; label: string };
  /** farbrengen | short_talk | document | undated (from the TOC heading style). */
  kind?: 'farbrengen' | 'short_talk' | 'document' | 'undated' | string;
  gregorianDate: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  sourceUrl: string;
  verification: Verification;
}

export type TmItemType = 'sicha' | 'maamar' | 'reshima' | 'letter' | 'telegram' | 'editorial' | 'other';

export interface TmItem {
  id: string;
  gatheringId: string;
  volumeId: string;
  type: TmItemType;
  ordinal: number;
  heTitle: string;
  dibburHamaschil: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  sectionCount: number | null;
  sectionLabels: string[] | null;
  /** Printed page labels covered by this unit (verified from the digital edition's page markers). */
  pageLabels?: string[] | null;
  subtype?: string;
  tocHeading?: string;
  openingWords?: string;
  textChars?: number;
  sourceUrl: string;
  verification: Verification;
  notes?: string;
}

export interface TorasMenachemCatalogue {
  schemaVersion: number;
  generatedAt: string;
  sources: SourceRef[];
  volumes: TmVolume[];
  gatherings: TmGathering[];
  items: TmItem[];
}

/* ---------- Likkutei Sichos ---------- */
export interface LsVolume {
  id: string; // ls-10
  number: number;
  heNumber: string;
  sefer: string;
  heTitle: string;
  pageCount: number | null;
  sourceIds: string[];
  verification: Verification;
}

export interface LsSicha {
  id: string; // ls-10-lech-lecha-1
  volumeId: string;
  kind: 'parsha' | 'festival' | 'date';
  parsha: string | null;
  heParsha: string;
  occasion: string | null;
  ordinal: number;
  heTitle: string;
  topic: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  sectionCount: number | null;
  sourceUrls: string[];
  verification: Verification;
  notes?: string;
}

export interface LikkuteiSichosCatalogue {
  schemaVersion: number;
  generatedAt: string;
  sources: SourceRef[];
  volumes: LsVolume[];
  sichos: LsSicha[];
}

/* ---------- Maamarim program ---------- */
export interface MaamarEntry {
  id: string; // maamar-5711-vaeleh-hamishpatim
  order: number; // source order in the volumes (1-based)
  heTitle: string; // dibbur hamaschil as printed
  year: number;
  heDate: string;
  occasionLabel: string;
  /** Link to the Toras Menachem item id when the TOC has been matched. */
  tmItemId: string | null;
  volumeId: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  pageLabels?: string[] | null;
  gatheringId?: string | null;
  sourceUrl?: string | null;
  dibburHamaschilPrinted?: string | null;
  sectionCount: number | null;
  verification: Verification;
  notes?: string;
}

export interface MaamarimCatalogue {
  schemaVersion: number;
  generatedAt: string;
  notes: string;
  maamarim: MaamarEntry[];
}

/* ---------- Physical editions (3D shelf) ---------- */
export type BindingMaterial = 'leather' | 'cloth' | 'paper' | 'leatherette';

export interface PhysicalVolume {
  id: string;
  /** Which canonical works/volumes this physical object represents. */
  canonicalIds: string[];
  collectionId: string;
  spineTitle: string; // Hebrew, as stamped on the spine (stylized)
  spineSubtitle?: string | null;
  coverTitle: string;
  /** Approximate size in cm (height, width, thickness). */
  size: { h: number; w: number; t: number };
  material: BindingMaterial;
  /** Hex colours for the stylized binding. */
  colors: { binding: string; accent: string; text: string; edge?: string };
  /** Shelf layout */
  shelf: number;
  order: number;
  /** Provenance of the visual representation. */
  visual: { basis: 'stylized' | 'edition_reference' | 'vector_recreation'; note: string };
  /** Vector cover/spine/back artwork (src/art) with this volume's own wording (year, volume letter, sefer or masechta name …). */
  design?: { id: DesignId; labels: string[] };
  /** Which program(s) open this book's log. */
  programs: string[];
  /** For Shas: the masechta id, so the current masechta can be highlighted. */
  masechta?: string | null;
}

export interface Collection {
  id: string;
  heTitle: string;
  enTitle: string;
  order: number;
}

export interface PhysicalLibrary {
  schemaVersion: number;
  collections: Collection[];
  volumes: PhysicalVolume[];
}
