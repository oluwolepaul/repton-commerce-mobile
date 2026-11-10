import { useState, type ReactNode } from 'react';

import { OnboardingExperience } from '@/components/onboarding-experience';

type OnboardingGateProps = { children: ReactNode };

export function OnboardingGate({ children }: OnboardingGateProps) {
  const [showOnboarding, setShowOnboarding] = useState(true);

  if (showOnboarding) return <OnboardingExperience onFinish={() => setShowOnboarding(false)} />;
  return children;
}
