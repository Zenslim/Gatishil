'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2';
    const variants: Record<string, string> = {
      default:
        'bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20',
      outline:
        'border border-amber-500 text-amber-500 hover:bg-amber-500/10',
      ghost:
        'text-amber-400 hover:bg-amber-400/10',
    };
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
