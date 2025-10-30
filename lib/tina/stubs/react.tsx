'use client';

import { createContext, useContext, type ReactNode } from 'react';

type TinaProviderProps = {
  children: ReactNode;
  tinaConfig?: unknown;
};

type TinaContextValue = {
  query?: string;
  variables?: Record<string, unknown>;
  data?: unknown;
};

const TinaContext = createContext<TinaContextValue | null>(null);

export function TinaEditProvider({ children }: TinaProviderProps) {
  return <>{children}</>;
}

export function TinaCMSProvider({ children }: TinaProviderProps) {
  return <TinaContext.Provider value={null}>{children}</TinaContext.Provider>;
}

type UseTinaReturn<T> = T & { data: T extends { data: infer Data } ? Data : unknown };

type UseTinaProps = {
  query: string;
  variables: Record<string, unknown>;
  data: unknown;
};

export function useTina<T extends UseTinaProps>(props: T): UseTinaReturn<T> {
  const ctx = useContext(TinaContext);
  if (ctx) {
    return {
      ...props,
      data: props.data,
    } as UseTinaReturn<T>;
  }
  return props as UseTinaReturn<T>;
}
