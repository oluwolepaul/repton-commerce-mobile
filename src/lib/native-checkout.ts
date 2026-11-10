import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';

declare const require: (moduleName: string) => unknown;

type CheckoutCompletedEvent = { orderDetails: { id: string } };
type CheckoutException = { message: string };
type CheckoutSheet = {
  present: (url: string) => void;
  addEventListener: {
    (event: 'completed', callback: (event: CheckoutCompletedEvent) => void): unknown;
    (event: 'error', callback: (error: CheckoutException) => void): unknown;
    (event: 'close', callback: () => void): unknown;
  };
};
type CheckoutModule = {
  ShopifyCheckoutSheet: new (configuration: Record<string, unknown>) => CheckoutSheet;
  ColorScheme: { light: string };
};

type CheckoutCallbacks = {
  onCompleted?: (event: CheckoutCompletedEvent) => void;
  onError?: (message: string) => void;
  onClose?: () => void;
};

const configuration = {
  title: 'Checkout',
  colors: {
    ios: { backgroundColor: '#FFFFFF', tintColor: '#D71920', closeButtonColor: '#171717' },
    android: {
      backgroundColor: '#FFFFFF',
      progressIndicator: '#D71920',
      headerBackgroundColor: '#FFFFFF',
      headerTextColor: '#171717',
      closeButtonColor: '#171717',
    },
  },
};

let checkoutSheet: CheckoutSheet | null = null;
let activeCallbacks: CheckoutCallbacks | null = null;

export function isCheckoutNativeModuleAvailable() {
  return Platform.OS !== 'web' && Constants.appOwnership !== 'expo' && (
    TurboModuleRegistry.get('ShopifyCheckoutSheetKit') !== null ||
    NativeModules.ShopifyCheckoutSheetKit !== undefined
  );
}

async function openBrowserCheckout(checkoutUrl: string) {
  await WebBrowser.openBrowserAsync(checkoutUrl, {
    controlsColor: '#D71920',
    toolbarColor: '#D71920',
    enableBarCollapsing: true,
  });
  return 'browser' as const;
}

async function createCheckoutSheet() {
  if (checkoutSheet) return checkoutSheet;
  const { ShopifyCheckoutSheet, ColorScheme } = require('@shopify/checkout-sheet-kit') as CheckoutModule;
  checkoutSheet = new ShopifyCheckoutSheet({ ...configuration, colorScheme: ColorScheme.light });
  checkoutSheet.addEventListener('completed', (event: CheckoutCompletedEvent) => {
    activeCallbacks?.onCompleted?.(event);
  });
  checkoutSheet.addEventListener('error', (error: CheckoutException) => {
    activeCallbacks?.onError?.(error.message);
  });
  checkoutSheet.addEventListener('close', () => {
    const callbacks = activeCallbacks;
    activeCallbacks = null;
    callbacks?.onClose?.();
  });
  return checkoutSheet;
}

export async function presentCheckout(checkoutUrl: string, callbacks: CheckoutCallbacks) {
  if (!isCheckoutNativeModuleAvailable()) {
    return openBrowserCheckout(checkoutUrl);
  }

  try {
    const sheet = await createCheckoutSheet();
    activeCallbacks = callbacks;
    sheet.present(checkoutUrl);
    return 'native' as const;
  } catch (error) {
    activeCallbacks = null;
    if (error instanceof Error && error.message.includes("native module 'ShopifyCheckoutSheetKit'")) {
      return openBrowserCheckout(checkoutUrl);
    }
    throw error;
  }
}
