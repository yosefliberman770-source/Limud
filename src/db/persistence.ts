/** Where the SQLite file bytes live. The database itself runs in memory (sql.js) and is flushed on change. */
export interface PersistenceAdapter {
  readonly kind: string;
  load(): Promise<Uint8Array | null>;
  save(bytes: Uint8Array): Promise<void>;
}

export class MemoryPersistence implements PersistenceAdapter {
  readonly kind = 'memory';
  private bytes: Uint8Array | null = null;
  async load() { return this.bytes; }
  async save(b: Uint8Array) { this.bytes = b; }
}

const IDB_NAME = 'seder-halimud';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'main.db';

export class IndexedDbPersistence implements PersistenceAdapter {
  readonly kind = 'indexeddb';
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async load(): Promise<Uint8Array | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result as ArrayBuffer) : null);
      req.onerror = () => reject(req.error);
    });
  }
  async save(bytes: Uint8Array): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

/** Capacitor Filesystem persistence (Android): Directory.Data/seder-halimud.db, base64 encoded. */
export class CapacitorFilePersistence implements PersistenceAdapter {
  readonly kind = 'capacitor-filesystem';
  private readonly path = 'seder-halimud/main.db';
  async load(): Promise<Uint8Array | null> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    try {
      const r = await Filesystem.readFile({ path: this.path, directory: Directory.Data });
      const data = r.data as string;
      const bin = atob(data);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    } catch {
      return null;
    }
  }
  async save(bytes: Uint8Array): Promise<void> {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    let s = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    const b64 = btoa(s);
    try { await Filesystem.mkdir({ path: 'seder-halimud', directory: Directory.Data, recursive: true }); } catch { /* exists */ }
    // write to temp then rename for atomicity
    await Filesystem.writeFile({ path: this.path + '.tmp', directory: Directory.Data, data: b64 });
    try { await Filesystem.deleteFile({ path: this.path, directory: Directory.Data }); } catch { /* first write */ }
    await Filesystem.rename({ from: this.path + '.tmp', to: this.path, directory: Directory.Data });
  }
}
