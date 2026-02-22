import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// Use static process.env references so Expo can inline EXPO_PUBLIC_* at build time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

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

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function getStorage(): AuthStorage {
  if (typeof localStorage !== "undefined") {
    return {
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
  }
  try {
    require("expo-sqlite/localStorage/install");
    if (typeof localStorage !== "undefined") {
      return {
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
    }
  } catch {
    // ExpoSQLite native module not available
  }
  try {
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    return AsyncStorage;
  } catch {
    // AsyncStorage native module not available
  }
  return inMemoryStorage;
}

const underlying = getStorage();

const storage: AuthStorage = {
  getItem: async (key) => {
    try {
      return await underlying.getItem(key);
    } catch {
      return inMemoryStorage.getItem(key);
    }
  },
  setItem: async (key, value) => {
    try {
      await underlying.setItem(key, value);
    } catch {
      await inMemoryStorage.setItem(key, value);
    }
  },
  removeItem: async (key) => {
    try {
      await underlying.removeItem(key);
    } catch {
      await inMemoryStorage.removeItem(key);
    }
  }
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      }
    })
  : null;

if (supabase && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
