import { useCallback, useEffect, useState } from "react";

import { storage } from "../services/storage";

export type ItemStatus = "done" | "still_due" | "reply" | null;

const STORAGE_KEY_PREFIX = "marvin:itemStatuses:";

export function useItemStatuses(userId: string) {
  const [itemStatuses, setItemStatusesState] = useState<Record<string, ItemStatus>>({});
  const [loaded, setLoaded] = useState(false);

  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    storage
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
          storage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
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
