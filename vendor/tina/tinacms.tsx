'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type TinaCMSOptions = {
  enabled?: boolean;
  toolbar?: { hidden?: boolean };
};

export class TinaCMS {
  enabled: boolean;
  toolbar: { hidden: boolean };

  constructor(options: TinaCMSOptions = {}) {
    this.enabled = Boolean(options.enabled);
    this.toolbar = { hidden: options.toolbar?.hidden ?? true };
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }
}

const TinaContext = createContext<TinaCMS | null>(null);

export function TinaProvider({ cms, children }: { cms: TinaCMS; children: ReactNode }) {
  return <TinaContext.Provider value={cms}>{children}</TinaContext.Provider>;
}

export function useCMS(): TinaCMS {
  const cms = useContext(TinaContext);
  if (!cms) {
    throw new Error('useCMS must be used within <TinaProvider>');
  }
  return cms;
}

export type FormOptions<FormValues extends Record<string, any>> = {
  id: string;
  label?: string;
  initialValues: FormValues;
  onSubmit: (values: FormValues) => Promise<void> | void;
};

export type Form<FormValues extends Record<string, any>> = {
  id: string;
  submit: () => Promise<void>;
  reset: () => void;
  updateInitialValues: (values: FormValues) => void;
  setFieldValue: <Key extends keyof FormValues>(name: Key, value: FormValues[Key]) => void;
  get values(): FormValues;
};

type FormContextValue<FormValues extends Record<string, any>> = {
  form: Form<FormValues>;
  values: FormValues;
};

const FormContext = createContext<FormContextValue<any> | null>(null);

export function FormProvider<FormValues extends Record<string, any>>({
  form,
  values,
  children,
}: {
  form: Form<FormValues>;
  values: FormValues;
  children: ReactNode;
}) {
  const memo = useMemo(() => ({ form, values }), [form, values]);
  return <FormContext.Provider value={memo}>{children}</FormContext.Provider>;
}

export function useFormContext<FormValues extends Record<string, any>>() {
  const ctx = useContext(FormContext);
  if (!ctx) {
    throw new Error('useFormContext must be used within <FormProvider>');
  }
  return ctx as FormContextValue<FormValues>;
}

export function useForm<FormValues extends Record<string, any>>(
  options: FormOptions<FormValues>,
): [FormValues, Form<FormValues>] {
  const [values, setValues] = useState<FormValues>(options.initialValues);
  const initialRef = useRef<FormValues>(options.initialValues);
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const submit = useCallback(async () => {
    const next = valuesRef.current;
    await options.onSubmit(next);
    initialRef.current = next;
  }, [options]);

  const reset = useCallback(() => {
    setValues(initialRef.current);
  }, []);

  const updateInitialValues = useCallback((next: FormValues) => {
    initialRef.current = next;
    setValues(next);
  }, []);

  const formRef = useRef<Form<FormValues>>();
  if (!formRef.current) {
    formRef.current = {
      id: options.id,
      submit,
      reset,
      updateInitialValues,
      setFieldValue: (name, value) => {
        setValues((prev) => ({ ...prev, [name]: value }));
      },
      get values() {
        return valuesRef.current;
      },
    };
  }

  useEffect(() => {
    formRef.current!.submit = submit;
    formRef.current!.reset = reset;
    formRef.current!.updateInitialValues = updateInitialValues;
  }, [submit, reset, updateInitialValues]);

  useEffect(() => {
    if (formRef.current && formRef.current.id !== options.id) {
      formRef.current.id = options.id;
    }
  }, [options.id]);

  return [values, formRef.current];
}

export function usePlugin(_plugin: unknown) {
  // Plugins are no-ops in this trimmed-down environment.
}
