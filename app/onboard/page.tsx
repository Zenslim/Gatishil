'use client';

import OnboardingFlow from '@/components/OnboardingFlow';

/**
 * Public Onboarding page (guest-friendly).
 * No auth/session checks here. We invite trust/passkey later inside the flow.
 */
export const dynamic = 'force-dynamic';

export default function OnboardPage() {
  return <OnboardingFlow />;
}
