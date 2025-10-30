'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { FormProvider, useCMS, useFormContext, type Form } from './tinacms';

type InlineContextValue = {
  form: Form<Record<string, any>>;
  editing: boolean;
};

const InlineContext = createContext<InlineContextValue | null>(null);

export function InlineForm<FormValues extends Record<string, any>>({
  form,
  children,
  className,
}: {
  form: Form<FormValues>;
  children: React.ReactNode;
  className?: string;
}) {
  const cms = useCMS();
  const editing = cms.enabled;
  const memo = useMemo(() => ({ form: form as Form<Record<string, any>>, editing }), [form, editing]);

  return (
    <FormProvider form={form} values={form.values}>
      <InlineContext.Provider value={memo}>
        <form
          className={className}
          onSubmit={(event) => {
            event.preventDefault();
            void form.submit();
          }}
        >
          {children}
        </form>
      </InlineContext.Provider>
    </FormProvider>
  );
}

function useInlineField(name: string) {
  const ctx = useContext(InlineContext);
  if (!ctx) {
    throw new Error('Inline fields must be rendered within <InlineForm>.');
  }
  const { form, editing } = ctx;
  const { values } = useFormContext<Record<string, any>>();
  const value = values?.[name] ?? '';
  return {
    value,
    editing,
    setValue(next: string) {
      form.setFieldValue(name as any, next);
    },
  };
}

export function InlineText({
  name,
  className,
  placeholder,
  displayOnlyClassName,
}: {
  name: string;
  className?: string;
  placeholder?: string;
  displayOnlyClassName?: string;
}) {
  const { value, editing, setValue } = useInlineField(name);
  if (!editing) {
    return <span className={displayOnlyClassName}>{value || placeholder || ''}</span>;
  }
  return (
    <input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
      placeholder={placeholder}
    />
  );
}

export function InlineTextarea({
  name,
  className,
  rows = 6,
  placeholder,
  displayOnlyClassName,
}: {
  name: string;
  className?: string;
  rows?: number;
  placeholder?: string;
  displayOnlyClassName?: string;
}) {
  const { value, editing, setValue } = useInlineField(name);
  if (!editing) {
    return (
      <div className={displayOnlyClassName}>{value || placeholder || ''}</div>
    );
  }
  return (
    <textarea
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
      rows={rows}
      placeholder={placeholder}
    />
  );
}
