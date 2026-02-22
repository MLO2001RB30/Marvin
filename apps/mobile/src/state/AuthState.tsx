import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

type AuthScreenMode = "login" | "signup";

interface AuthStateValue {
  isConfigured: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  mode: AuthScreenMode;
  session: Session | null;
  user: User | null;
  errorMessage: string | null;
  setMode: (mode: AuthScreenMode) => void;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthStateContext = createContext<AuthStateValue | null>(null);

export function AuthStateProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<AuthScreenMode>("signup");
  const [session, setSession] = useState<Session | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }
      clearTimeout(timeout);
      setSession(data.session ?? null);
      if (error) {
        setErrorMessage(error.message);
      }
      setIsLoading(false);
    }).catch(() => {
      if (mounted) {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthStateValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      isLoading,
      isAuthenticated: Boolean(session?.access_token),
      mode,
      session,
      user: session?.user ?? null,
      errorMessage,
      setMode,
      clearError: () => setErrorMessage(null),
      signIn: async (email, password) => {
        if (!supabase) {
          setErrorMessage(
            "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
          );
          return;
        }
        setErrorMessage(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMessage(error.message);
        }
      },
      signUp: async (email, password, firstName) => {
        if (!supabase) {
          setErrorMessage(
            "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
          );
          return;
        }
        setErrorMessage(null);
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              name: firstName
            }
          }
        });
        if (error) {
          setErrorMessage(error.message);
          return;
        }
        setMode("login");
        setErrorMessage("Account created. Check your email confirmation and log in.");
      },
      signOut: async () => {
        if (!supabase) {
          return;
        }
        setErrorMessage(null);
        const { error } = await supabase.auth.signOut();
        if (error) {
          setErrorMessage(error.message);
        }
      }
    }),
    [errorMessage, isLoading, mode, session]
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (!context) {
    throw new Error("useAuthState must be used inside AuthStateProvider");
  }
  return context;
}
