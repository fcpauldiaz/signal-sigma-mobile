import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAuthStatus,
  getAuthToken,
  hydrateSession,
  login as apiLogin,
  logout as apiLogout,
  setAssetFilter as persistAssetFilter,
  setAuthToken,
  setTradingMode,
  type AssetFilter,
  type TradingMode,
} from "./api";
import { registerDeskPush } from "./notifications";

type Session = {
  ready: boolean;
  token: string | null;
  mode: TradingMode;
  assetFilter: AssetFilter;
  authEnabled: boolean;
  authenticated: boolean;
  needsLogin: boolean;
  setMode: (mode: TradingMode) => void;
  setAssetFilter: (filter: AssetFilter) => void;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

function SessionInner({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [mode, setModeState] = useState<TradingMode>("paper");
  const [assetFilter, setAssetFilterState] = useState<AssetFilter>("all");

  useEffect(() => {
    void hydrateSession().then((session) => {
      setToken(session.token);
      setModeState(session.mode);
      setAssetFilterState(session.assetFilter);
      setReady(true);
    });
  }, []);

  const authQ = useQuery({
    queryKey: ["auth", token],
    queryFn: () => fetchAuthStatus(getAuthToken()),
    enabled: ready,
    refetchInterval: 60_000,
  });

  const authEnabled = Boolean(authQ.data?.authEnabled);
  const authenticated = Boolean(authQ.data?.authenticated);
  const needsLogin = ready && authEnabled && !authenticated;

  useEffect(() => {
    if (authEnabled && !authenticated && token) {
      setAuthToken(null);
      setToken(null);
    }
  }, [authEnabled, authenticated, token]);

  useEffect(() => {
    if (!ready || needsLogin || !authenticated) return;
    void registerDeskPush().catch((error) => {
      console.warn(
        "Push registration skipped:",
        error instanceof Error ? error.message : error
      );
    });
  }, [ready, needsLogin, authenticated]);

  const value = useMemo<Session>(
    () => ({
      ready,
      token,
      mode,
      assetFilter,
      authEnabled,
      authenticated,
      needsLogin,
      setMode: (next) => {
        setTradingMode(next);
        setModeState(next);
        void qc.invalidateQueries();
      },
      setAssetFilter: (next) => {
        persistAssetFilter(next);
        setAssetFilterState(next);
      },
      login: async (password) => {
        const data = await apiLogin(password);
        setAuthToken(data.token);
        setToken(data.token);
        void qc.invalidateQueries({ queryKey: ["auth"] });
      },
      logout: async () => {
        if (token) await apiLogout(token);
        setAuthToken(null);
        setToken(null);
        void qc.invalidateQueries({ queryKey: ["auth"] });
      },
    }),
    [ready, token, mode, assetFilter, authEnabled, authenticated, needsLogin, qc]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1 },
        },
      })
  );
  return (
    <QueryClientProvider client={client}>
      <SessionInner>{children}</SessionInner>
    </QueryClientProvider>
  );
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
