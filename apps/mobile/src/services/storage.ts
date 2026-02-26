/**
 * Cross-platform storage that avoids loading AsyncStorage on web,
 * which causes "NativeModule: AsyncStorage is null" errors.
 */
import { Platform } from "react-native";

const inMemoryStore: Record<string, string> = {};
const inMemoryStorage = {
  getItem: (key: string) => Promise.resolve(inMemoryStore[key] ?? null),
  setItem: (key: string, value: string) => {
    inMemoryStore[key] = value;
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    delete inMemoryStore[key];
    return Promise.resolve();
  }
};

export type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let _adapter: StorageAdapter | null = null;

function getAdapter(): StorageAdapter {
  if (_adapter) return _adapter;

  // Web: use localStorage - NEVER load AsyncStorage (causes NativeModule is null)
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      _adapter = {
        getItem: (key) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key, value) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        }
      };
      return _adapter;
    }
    _adapter = inMemoryStorage;
    return _adapter;
  }

  // Native: try expo-sqlite localStorage first (works in Expo Go)
  try {
    require("expo-sqlite/localStorage/install");
    if (typeof localStorage !== "undefined") {
      _adapter = {
        getItem: (key) => Promise.resolve(localStorage.getItem(key)),
        setItem: (key, value) => {
          localStorage.setItem(key, value);
          return Promise.resolve();
        },
        removeItem: (key) => {
          localStorage.removeItem(key);
          return Promise.resolve();
        }
      };
      return _adapter;
    }
  } catch {
    // ExpoSQLite not available
  }

  // Native: try AsyncStorage (requires dev build / native rebuild)
  try {
    const mod = require("@react-native-async-storage/async-storage");
    const AsyncStorage = mod.default ?? mod;
    if (AsyncStorage?.getItem && AsyncStorage?.setItem && AsyncStorage?.removeItem) {
      _adapter = AsyncStorage;
      return _adapter;
    }
  } catch {
    // AsyncStorage native module not available (e.g. needs rebuild)
  }

  _adapter = inMemoryStorage;
  return _adapter;
}

export const storage: StorageAdapter = {
  getItem: async (key) => {
    try {
      return await getAdapter().getItem(key);
    } catch {
      return inMemoryStorage.getItem(key);
    }
  },
  setItem: async (key, value) => {
    try {
      await getAdapter().setItem(key, value);
    } catch {
      await inMemoryStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    try {
      await getAdapter().removeItem(key);
    } catch {
      await inMemoryStorage.removeItem(key);
    }
  }
};
