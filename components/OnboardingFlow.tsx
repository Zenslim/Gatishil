'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = { lang?: 'en' | 'np' };

const WelcomeStep   = dynamic(() => import('@/components/onboard/WelcomeStep'),   { ssr: false });
const NameFaceStep  = dynamic(() => import('@/components/onboard/NameFaceStep'),  { ssr: false });
const RootsStep     = dynamic(() => import('@/components/onboard/RootsStep'),     { ssr: false });
const AtmaDishaStep = dynamic(() => import('@/components/AtmaDisha/AtmaDisha'),   { ssr: false });
const TrustStep     = dynamic(() => import('@/components/onboard/TrustStep'),     { ssr: false });

const VALID_STEPS = ['entry', 'name', 'roots', 'atma', 'trust'] as const;
type Step = typeof VALID_STEPS[number];

export default function OnboardingFlow({ lang = 'en' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStep = searchParams.get('step');
  const step: Step = (VALID_STEPS.includes((rawStep || '') as Step) ? rawStep : 'entry') as Step;

  const go = (s: Step) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('step', s);
    if (!sp.get('src')) sp.set('src', 'join');
    router.push(`/onboard?${sp.toString()}`);
  };

  const t = lang;
  const onNext = (s: string) => go((s as Step) || 'entry');

  const backMap: Record<Step, Step | null> = {
    entry: null,
    name:  'entry',
    roots: 'name',
    atma:  'roots',
    trust: 'atma',
  };

  const onBack = () => {
    const prev = backMap[step];
    if (prev) go(prev);
    else router.push('/');
  };

  // Normalize ugly URLs like ?step=undefined / ?step=null / ?step=foo → ?step=entry
  useEffect(() => {
    const raw = searchParams.get('step');
    const valid = raw && VALID_STEPS.includes(raw as Step);
    if (!valid) {
      const sp = new URLSearchParams(searchParams.toString());
      sp.set('step', 'entry');
      if (!sp.get('src')) sp.set('src', 'join');
      router.replace(`/onboard?${sp.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount to clean the URL

  switch (step) {
    case 'entry': return <WelcomeStep   t={t} onNext={onNext} onBack={onBack} />;
    case 'name':  return <NameFaceStep  t={t} onNext={onNext} onBack={onBack} />;
    case 'roots': return <RootsStep     t={t} onNext={onNext} onBack={onBack} />;
    case 'atma':  return <AtmaDishaStep t={t} onNext={onNext} onBack={onBack} />;
    case 'trust': return <TrustStep     t={t} onNext={onNext} onBack={onBack} />;
    default:      return <WelcomeStep   t={t} onNext={onNext} onBack={onBack} />;
  }
}
