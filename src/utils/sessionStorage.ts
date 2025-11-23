export interface ProductSession {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  totalRows: number;
  totalColumns: number;
  selectedRowsCount: number;
  parsedData: Record<string, any>[];
  headers: string[];
  imageColumnIndex: number;
  titleColumnIndex: number;
  searchTerm: string;
  selectedRows: number[];
  currentPage: number;
  itemsPerPage: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  visibleColumns: string[];
}

export interface SessionMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  fileName: string;
  totalRows: number;
  totalColumns: number;
  selectedRowsCount: number;
}

const DB_NAME = 'ProductFileManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
        objectStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
    };
  });
}

export async function saveSession(session: ProductSession): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(session);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadSession(sessionId: string): Promise<ProductSession | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(sessionId);
    
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllSessions(): Promise<SessionMetadata[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onsuccess = () => {
      const sessions = request.result as ProductSession[];
      const metadata = sessions.map(session => ({
        id: session.id,
        name: session.name,
        createdAt: session.createdAt,
        lastModified: session.lastModified,
        fileName: session.fileName,
        totalRows: session.totalRows,
        totalColumns: session.totalColumns,
        selectedRowsCount: session.selectedRowsCount,
      }));
      resolve(metadata);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(sessionId);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateSession(sessionId: string, updates: Partial<ProductSession>): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) throw new Error('Session not found');
  
  const updatedSession = { ...session, ...updates, lastModified: new Date().toISOString() };
  await saveSession(updatedSession);
}
