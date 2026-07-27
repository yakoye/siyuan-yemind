export interface WebKeyValueStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  transaction(values: Record<string, unknown>): Promise<void>;
}

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;

export function createMemoryWebStore(): WebKeyValueStore {
  const values = new Map<string, unknown>();
  let writeQueue = Promise.resolve();
  return {
    async get(key) {
      await writeQueue;
      const value = values.get(key);
      return value === undefined ? undefined : clone(value);
    },
    set(key, value) {
      const operation = writeQueue.then(() => {
        values.set(key, clone(value));
      });
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
    delete(key) {
      const operation = writeQueue.then(() => {
        values.delete(key);
      });
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
    transaction(patch) {
      const operation = writeQueue.then(() => {
        for (const [key, value] of Object.entries(patch)) {
          values.set(key, clone(value));
        }
      });
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
  };
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export function createIndexedDbWebStore(
  indexedDb: IDBFactory = window.indexedDB,
): WebKeyValueStore {
  let databasePromise: Promise<IDBDatabase> | null = null;
  let writeQueue = Promise.resolve();
  const database = (): Promise<IDBDatabase> => {
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const request = indexedDb.open('yemind-web', 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains('documents')) {
            request.result.createObjectStore('documents');
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
      });
    }
    return databasePromise;
  };
  const enqueue = (run: () => Promise<void>): Promise<void> => {
    const operation = writeQueue.then(run);
    writeQueue = operation.catch(() => undefined);
    return operation;
  };
  return {
    async get(key) {
      await writeQueue;
      const db = await database();
      const transaction = db.transaction('documents', 'readonly');
      return requestValue(transaction.objectStore('documents').get(key));
    },
    set(key, value) {
      return enqueue(async () => {
        const db = await database();
        const transaction = db.transaction('documents', 'readwrite');
        transaction.objectStore('documents').put(clone(value), key);
        await transactionComplete(transaction);
      });
    },
    delete(key) {
      return enqueue(async () => {
        const db = await database();
        const transaction = db.transaction('documents', 'readwrite');
        transaction.objectStore('documents').delete(key);
        await transactionComplete(transaction);
      });
    },
    transaction(values) {
      return enqueue(async () => {
        const db = await database();
        const transaction = db.transaction('documents', 'readwrite');
        const store = transaction.objectStore('documents');
        for (const [key, value] of Object.entries(values)) {
          store.put(clone(value), key);
        }
        await transactionComplete(transaction);
      });
    },
  };
}

export function jsonStorage<T>(store: WebKeyValueStore, key: string): {
  load(): Promise<unknown>;
  save(value: T): Promise<void>;
} {
  return {
    load: () => store.get(key),
    save: (value) => store.set(key, value),
  };
}
