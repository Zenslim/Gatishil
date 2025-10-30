'use client';

import type { ReactNode } from 'react';
import { TinaEditProvider, TinaCMSProvider } from 'tinacms/dist/react';
import tinaConfig from '@/tina/config';

type TinaProviderProps = {
  children: ReactNode;
};

export default function TinaProvider({ children }: TinaProviderProps) {
  return (
    <TinaEditProvider tinaConfig={tinaConfig}>
      <TinaCMSProvider tinaConfig={tinaConfig}>{children}</TinaCMSProvider>
    </TinaEditProvider>
  );
}
