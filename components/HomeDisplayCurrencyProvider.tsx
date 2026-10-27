"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_CURRENCY } from "@/lib/cruise-search/constants";
import { parseCurrencyCode } from "@/lib/cruise-search/currency";
import type { CurrencyCode } from "@/lib/cruise-search/types";

const STORAGE_KEY = "vcruise-display-currency";

type ContextValue = {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
};

const HomeDisplayCurrencyContext = createContext<ContextValue | null>(null);

export function HomeDisplayCurrencyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCurrencyState(parseCurrencyCode(stored));
    } catch {
      // ignore
    }
  }, []);

  const setCurrency = useCallback((next: CurrencyCode) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency }),
    [currency, setCurrency],
  );

  return (
    <HomeDisplayCurrencyContext.Provider value={value}>
      {children}
    </HomeDisplayCurrencyContext.Provider>
  );
}

export function useHomeDisplayCurrency() {
  const ctx = useContext(HomeDisplayCurrencyContext);
  if (!ctx) {
    throw new Error(
      "useHomeDisplayCurrency must be used within HomeDisplayCurrencyProvider",
    );
  }
  return ctx;
}
