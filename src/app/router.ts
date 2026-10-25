export type Route =
  | { name: 'library'; bookId?: string }
  | { name: 'today'; date?: string }
  | { name: 'week'; date?: string }
  | { name: 'calendar'; date?: string }
  | { name: 'progress' }
  | { name: 'settings'; section?: string }
  | { name: 'search'; q?: string }
  | { name: 'history' }
  | { name: 'log'; programId: string; workId: string; occurrence?: string };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '').replace(/^\//, '');
  const [pathPart, query] = h.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(query ?? '');
  switch (parts[0]) {
    case undefined:
    case '':
    case 'library':
      return { name: 'library', bookId: parts[1] };
    case 'book':
      return { name: 'library', bookId: parts[1] };
    case 'today':
    case 'day':
      return { name: 'today', date: parts[1] };
    case 'week':
      return { name: 'week', date: parts[1] };
    case 'calendar':
      return { name: 'calendar', date: parts[1] };
    case 'progress':
      return { name: 'progress' };
    case 'settings':
      return { name: 'settings', section: parts[1] };
    case 'search':
      return { name: 'search', q: params.get('q') ?? undefined };
    case 'history':
      return { name: 'history' };
    case 'log':
      return { name: 'log', programId: parts[1] ?? '', workId: parts[2] ?? '', occurrence: parts[3] };
    default:
      return { name: 'library' };
  }
}

export function toHash(r: Route): string {
  switch (r.name) {
    case 'library': return r.bookId ? `#/book/${encodeURIComponent(r.bookId)}` : '#/library';
    case 'today': return r.date ? `#/day/${r.date}` : '#/today';
    case 'week': return r.date ? `#/week/${r.date}` : '#/week';
    case 'calendar': return r.date ? `#/calendar/${r.date}` : '#/calendar';
    case 'progress': return '#/progress';
    case 'settings': return r.section ? `#/settings/${r.section}` : '#/settings';
    case 'search': return r.q ? `#/search?q=${encodeURIComponent(r.q)}` : '#/search';
    case 'history': return '#/history';
    case 'log': return `#/log/${encodeURIComponent(r.programId)}/${encodeURIComponent(r.workId)}${r.occurrence ? `/${r.occurrence}` : ''}`;
  }
}

export function navigate(r: Route, replace = false): void {
  const h = toHash(r);
  if (replace) history.replaceState(null, '', h);
  else location.hash = h;
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function back(): void {
  history.back();
}
