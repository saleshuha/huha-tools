// IndexedDB storage for FBA Inventory data persistence

const DB_NAME = 'fba-inventory-db';
const DB_VERSION = 1;
const STORE_NAME = 'fba-data';
const DATA_KEY = 'current-session';

export interface FBAInventoryItem {
  asin: string;
  quantity: number;
  sku?: string;
  fnsku?: string;
  title?: string;
  condition?: string;
}

export interface StoredFBAInventory {
  items: FBAInventoryItem[];
  fileName?: string;
  lastModified: string;
  totalItems: number;
  totalQuantity: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function saveFBAInventory(
  items: FBAInventoryItem[],
  fileName?: string
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    const data: StoredFBAInventory = {
      items,
      fileName,
      lastModified: new Date().toISOString(),
      totalItems: items.length,
      totalQuantity,
    };

    store.put(data, DATA_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Failed to save FBA inventory data:', error);
  }
}

export async function loadFBAInventory(): Promise<StoredFBAInventory | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(DATA_KEY);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Failed to load FBA inventory data:', error);
    return null;
  }
}

export async function clearFBAInventory(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(DATA_KEY);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('Failed to clear FBA inventory data:', error);
  }
}
