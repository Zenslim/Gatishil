'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = { lang?: 'en' | 'np' };

const WelcomeStep   = dynamic(() => import('@/components/onboard/WelcomeStep'),   { ssr: false });
const NameFaceStep  = dynamic(() => import('@/components/onboard/NameFaceStep'),  { ssr: false });
const RootsStep     = dynamic(() => import('@/components/onboard/RootsStep'),     { ssr: false });
const AtmaDishaStep = dynamic(() => import('@/components/AtmaDisha/AtmaDisha'),   { ssr: false });
const TrustStep     = dynamic(() => import('@/components/onboard/TrustStep'),     { ssr: false });

export default function OnboardingFlow({ lang = 'en' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const step = (searchParams.get('step') ?? 'entry') as
    | 'entry' | 'name' | 'roots' | 'atma' | 'trust';

  const go = (s: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('step', s);
    if (!sp.get('src')) sp.set('src', 'join');
    router.push(`/onboard?${sp.toString()}`);
  };

  // Map to what step components expect
  const t = lang;
  const onNext = go;

  // Backward navigation map
  const backMap: Record<typeof step, string | null> = {
    entry: null,
    name:  'entry',
    roots: 'name',
    atma:  'roots',
    trust: 'atma',
  };

  const onBack = () => {
    const prev = backMap[step];
    if (prev) go(prev);
    else router.push('/'); // entry has no back → home
  };

  switch (step) {
    case 'entry': return <WelcomeStep   t={t} onNext={onNext} onBack={onBack} />;
    case 'name':  return <NameFaceStep  t={t} onNext={onNext} onBack={onBack} />;
    case 'roots': return <RootsStep     t={t} onNext={onNext} onBack={onBack} />;
    case 'atma':  return <AtmaDishaStep t={t} onNext={onNext} onBack={onBack} />;
    case 'trust': return <TrustStep     t={t} onNext={onNext} onBack={onBack} />;
    default:      return <WelcomeStep   t={t} onNext={onNext} onBack={onBack} />;
  }
}
