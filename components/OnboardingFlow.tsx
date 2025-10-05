'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = { lang?: 'en' | 'np' };

const WelcomeStep = dynamic(() => import('@/components/onboard/WelcomeStep'), { ssr: false });
const NameFaceStep = dynamic(() => import('@/components/onboard/NameFaceStep'), { ssr: false });
const RootsStep = dynamic(() => import('@/components/onboard/RootsStep'), { ssr: false });
const AtmaDishaStep = dynamic(() => import('@/components/AtmaDisha/AtmaDisha'), { ssr: false });
const TrustStep = dynamic(() => import('@/components/onboard/TrustStep'), { ssr: false });

export default function OnboardingFlow({ lang = 'en' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step = searchParams.get('step') ?? 'entry';

  const go = (s: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set('step', s);
    if (!sp.get('src')) sp.set('src', 'join');
    router.push(`/onboard?${sp.toString()}`);
  };

  switch (step) {
    case 'entry':
      return <WelcomeStep go={go} lang={lang} />;
    case 'name':
      return <NameFaceStep go={go} lang={lang} />;
    case 'roots':
      return <RootsStep go={go} lang={lang} />;
    case 'atma':
      return <AtmaDishaStep go={go} lang={lang} />;
    case 'trust':
      return <TrustStep go={go} lang={lang} />;
    default:
      return <WelcomeStep go={go} lang={lang} />;
  }
}

