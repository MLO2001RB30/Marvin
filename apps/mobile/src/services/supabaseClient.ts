import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { storage } from "./storage";

// Use static process.env references so Expo can inline EXPO_PUBLIC_* at build time
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const authStorage = {
  getItem: storage.getItem.bind(storage),
  setItem: storage.setItem.bind(storage),
  removeItem: storage.removeItem.bind(storage)
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: authStorage,
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
