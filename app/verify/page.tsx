'use client';

export default function Page() {
  if (typeof window !== 'undefined') {
    window.location.replace('/join');
  }
  return null;
}
