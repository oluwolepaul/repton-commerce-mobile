import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { OnboardingGate } from '@/components/onboarding-gate';
import { CartProvider } from '@/contexts/cart-context';
import { CustomerAccountProvider } from '@/contexts/customer-account-context';
import { FavoritesProvider } from '@/contexts/favorites-context';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <CartProvider>
        <FavoritesProvider>
          <CustomerAccountProvider>
            <OnboardingGate>
              <AppTabs />
            </OnboardingGate>
          </CustomerAccountProvider>
        </FavoritesProvider>
      </CartProvider>
    </ThemeProvider>
  );
}
