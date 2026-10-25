import { gematriya } from '@hebcal/core';

export const BOOK_HE: Record<string, string> = {
  Genesis: 'בראשית', Exodus: 'שמות', Leviticus: 'ויקרא', Numbers: 'במדבר', Deuteronomy: 'דברים',
  Joshua: 'יהושע', Judges: 'שופטים', 'I Samuel': 'שמואל א׳', 'II Samuel': 'שמואל ב׳', 'I Kings': 'מלכים א׳', 'II Kings': 'מלכים ב׳',
  Isaiah: 'ישעיהו', Jeremiah: 'ירמיהו', Ezekiel: 'יחזקאל', Hosea: 'הושע', Joel: 'יואל', Amos: 'עמוס', Obadiah: 'עובדיה', Jonah: 'יונה', Micah: 'מיכה', Nahum: 'נחום', Habakkuk: 'חבקוק', Zephaniah: 'צפניה', Haggai: 'חגי', Zechariah: 'זכריה', Malachi: 'מלאכי',
};

export interface VerseRef { k: string; b: string; e: string; v?: number }

/** "י״ח:א׳" */
export function heChapterVerse(cv: string): string {
  const [c, v] = cv.split(':').map(Number);
  return `${gematriya(c)}:${gematriya(v)}`;
}

/** "בראשית י״ח:א׳ – י״ח:י״ד" */
export function formatVerseRangeHe(r: VerseRef): string {
  const book = BOOK_HE[r.k] ?? r.k;
  return `${book} ${heChapterVerse(r.b)} – ${heChapterVerse(r.e)}`;
}

export function formatVerseRangeEn(r: VerseRef): string {
  return `${r.k} ${r.b} – ${r.e}`;
}

export function sefariaUrlForRange(r: VerseRef): string {
  const [bc, bv] = r.b.split(':');
  const [ec, ev] = r.e.split(':');
  const book = r.k.replace(/ /g, '_');
  return `https://www.sefaria.org/${book}.${bc}.${bv}-${ec}.${ev}?lang=he`;
}
