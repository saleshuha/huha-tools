// IndexedDB storage for Profit Analyzer data persistence

const DB_NAME = 'profit-analyzer-db';
const DB_VERSION = 1;
const STORE_NAME = 'profit-data';
const DATA_KEY = 'current-session';

interface ProfitSettings {
  shippingRatePerKg: number;
  flatShippingRate: number;
  useWeightBasedShipping: boolean;
  commissionPercentage: number;
  additionalFees: number;
  currency: string;
}

interface StoredProfitData {
  items: any[];
  settings: ProfitSettings;
  fileName?: string;
  lastModified: string;
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

export async function saveProfitAnalyzerData(
  items: any[],
  settings: ProfitSettings,
  fileName?: string
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const data: StoredProfitData = {
      items,
      settings,
      fileName,
      lastModified: new Date().toISOString(),
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
    console.error('Failed to save profit analyzer data:', error);
  }
}

export async function loadProfitAnalyzerData(): Promise<StoredProfitData | null> {
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
    console.error('Failed to load profit analyzer data:', error);
    return null;
  }
}

export async function clearProfitAnalyzerData(): Promise<void> {
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
    console.error('Failed to clear profit analyzer data:', error);
  }
}
