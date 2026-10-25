/** Numbers and dates inside Hebrew (right-to-left) text: isolate them left-to-right so "49–54" and "25.10 – 11.11" read in the right order. */
export const ltr = (s: string): string => `⁦${s}⁩`;
export const dateRange = (a: string, b: string): string => ltr(`${a} – ${b}`);
export const pageRange = (a: string | number, b?: string | number | null): string => ltr(b != null && b !== '' && String(b) !== String(a) ? `${a}–${b}` : String(a));
