/* Legacy ambient declarations for modules/components that are not yet ported to TypeScript. */
import type { BinaryLike, ScryptOptions } from 'crypto';
import type { Buffer } from 'node:buffer';
import type { ComponentType, ReactNode } from 'react';

declare module '@/components/onboard/RootsStep' {
  interface RootsStepProps {
    onNext?: () => void;
    onBack?: () => void;
    initialValue?: unknown;
    supabase?: unknown;
  }
  const RootsStep: ComponentType<RootsStepProps>;
  export default RootsStep;
}

declare module '@/components/ChautariLocationPicker' {
  interface ChautariLocationPickerProps {
    initialValue?: unknown;
    onChange?: (value: unknown) => void;
  }
  const ChautariLocationPicker: ComponentType<ChautariLocationPickerProps>;
  export default ChautariLocationPicker;
}

declare module '@/components/AtmaDisha/AtmaDisha' {
  interface AtmaDishaProps {
    onDone?: () => void;
  }
  const AtmaDisha: ComponentType<AtmaDishaProps>;
  export default AtmaDisha;
}

declare module '@supabase/supabase-js' {
  interface SupabaseClient<Database = any, SchemaName extends string = any, Schema = any> {
    commitCookies: (response: Response) => void;
  }
}

declare module 'crypto' {
  function scrypt(
    password: BinaryLike,
    salt: BinaryLike,
    keylen: number,
    options: (ScryptOptions & { N?: number; r?: number; p?: number }) | undefined,
    callback: (err: Error | null, derivedKey: Buffer) => void,
  ): void;
  function scrypt(
    password: BinaryLike,
    salt: BinaryLike,
    keylen: number,
    callback: (err: Error | null, derivedKey: Buffer) => void,
  ): void;
  function scryptSync(
    password: BinaryLike,
    salt: BinaryLike,
    keylen: number,
    options?: ScryptOptions & { N?: number; r?: number; p?: number },
  ): Buffer;
}

declare module 'react' {
  interface Attributes {
    nextPath?: string;
    supabase?: unknown;
  }
}
