import { useCallback, useEffect, useState } from "react";

export type ItemStatus = "done" | "still_due" | "reply" | null;

const STORAGE_KEY_PREFIX = "marvin:itemStatuses:";

const inMemoryStore: Record<string, string> = {};
const inMemoryStorage = {
  getItem: (key: string) => Promise.resolve(inMemoryStore[key] ?? null),
  setItem: (key: string, value: string) => {
    inMemoryStore[key] = value;
    return Promise.resolve();
  }
};

let _storage: { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void> } | null = null;

function getStorage() {
  if (_storage) return _storage;
  try {
    const mod = require("@react-native-async-storage/async-storage");
    const AsyncStorage = mod.default ?? mod;
    if (AsyncStorage?.getItem && AsyncStorage?.setItem) {
      _storage = {
        getItem: async (k) => {
          try {
            return await AsyncStorage.getItem(k);
          } catch {
            return inMemoryStorage.getItem(k);
          }
        },
        setItem: async (k, v) => {
          try {
            await AsyncStorage.setItem(k, v);
          } catch {
            await inMemoryStorage.setItem(k, v);
          }
        }
      };
      return _storage;
    }
  } catch {
    // Native module not ready (e.g. Expo Go, dev client before rebuild)
  }
  _storage = inMemoryStorage;
  return _storage;
}

export function useItemStatuses(userId: string) {
  const [itemStatuses, setItemStatusesState] = useState<Record<string, ItemStatus>>({});
  const [loaded, setLoaded] = useState(false);

  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    getStorage()
      .getItem(storageKey)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<string, string>;
            const filtered: Record<string, ItemStatus> = {};
            for (const [k, v] of Object.entries(parsed)) {
              if (v === "done" || v === "still_due" || v === "reply") filtered[k] = v;
            }
            setItemStatusesState(filtered);
          } catch {
            // Ignore parse errors
          }
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [storageKey]);

  const setItemStatus = useCallback(
    (itemId: string, status: ItemStatus) => {
      setItemStatusesState((prev) => {
        const next = status
          ? { ...prev, [itemId]: status }
          : (() => {
              const { [itemId]: _, ...rest } = prev;
              return rest;
            })();
        if (storageKey) {
          getStorage().setItem(storageKey, JSON.stringify(next)).catch(() => {});
        }
        return next;
      });
    },
    [storageKey]
  );

  const getItemStatus = useCallback(
    (itemId: string): ItemStatus => {
      return itemStatuses[itemId] ?? null;
    },
    [itemStatuses]
  );

  return { itemStatuses, setItemStatus, getItemStatus, loaded };
}
