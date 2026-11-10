import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import {
  createCustomerAddress,
  getCustomerAccountOverview,
  updateCustomerAddress,
  updateCustomerProfile,
  type CustomerAccountProfile,
  type CustomerAddressInput,
} from '@/lib/customer-account-api';
import { STORE_URL } from '@/lib/shopify';

type SavedSession = { accessToken: string; idToken?: string; expiresAt: number };
type OidcDiscovery = { authorization_endpoint: string; token_endpoint: string; end_session_endpoint?: string };
type CustomerAccountContextValue = {
  profile: CustomerAccountProfile | null;
  isLoading: boolean;
  isWorking: boolean;
  error: string;
  isSignedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (firstName: string, lastName: string) => Promise<void>;
  saveAddress: (address: CustomerAddressInput, addressId?: string, makeDefault?: boolean) => Promise<void>;
};

const CustomerAccountContext = createContext<CustomerAccountContextValue | null>(null);
const SESSION_KEY = 'repton-customer-account-session-v1';
const CLIENT_ID = String(Constants.expoConfig?.extra?.customerAccountClientId ?? '');
const CALLBACK_URI = 'shop.82257871092.reptongroup://callback';
const OIDC_DISCOVERY_URL = `${STORE_URL}/.well-known/openid-configuration`;

async function readSession() {
  const value = Platform.OS === 'web'
    ? globalThis.localStorage?.getItem(SESSION_KEY) ?? null
    : await SecureStore.getItemAsync(SESSION_KEY);
  if (!value) return null;
  try {
    const session = JSON.parse(value) as SavedSession;
    return typeof session.accessToken === 'string' && Number.isFinite(session.expiresAt) ? session : null;
  } catch {
    return null;
  }
}

async function requestCustomerSession(prompt?: 'none'): Promise<SavedSession | null> {
  const oidc = await getOidcDiscovery();
  const nonce = Crypto.randomUUID();
  const authRequest = await AuthSession.loadAsync({
    clientId: CLIENT_ID,
    redirectUri: CALLBACK_URI,
    responseType: AuthSession.ResponseType.Code,
    scopes: ['openid', 'email', 'customer-account-api:full'],
    usePKCE: true,
    extraParams: { nonce, ...(prompt ? { prompt } : {}) },
  }, oidc);
  const authResult = await authRequest.promptAsync(oidc);
  if (authResult.type !== 'success') {
    if (prompt === 'none' && authResult.type === 'error' && authResult.params.error === 'login_required') return null;
    if (authResult.type === 'error') {
      throw new Error(authResult.params.error_description ?? authResult.params.error ?? 'Shopify could not sign you in.');
    }
    return null;
  }
  if (authResult.params.state !== authRequest.state) throw new Error('The sign-in response could not be verified. Please try again.');
  const code = authResult.params.code;
  if (!code || !authRequest.codeVerifier) throw new Error('Shopify returned an incomplete sign-in response. Please try again.');
  const tokenResponse = await AuthSession.exchangeCodeAsync({
    clientId: CLIENT_ID,
    code,
    redirectUri: CALLBACK_URI,
    scopes: ['openid', 'email', 'customer-account-api:full'],
    extraParams: { code_verifier: authRequest.codeVerifier },
  }, oidc);
  if (!tokenResponse.accessToken) throw new Error('Shopify did not return an account access token.');
  return {
    accessToken: tokenResponse.accessToken,
    idToken: tokenResponse.idToken,
    expiresAt: Date.now() + (tokenResponse.expiresIn ?? 3600) * 1000,
  };
}

async function writeSession(session: SavedSession | null) {
  if (Platform.OS === 'web') {
    if (session) globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
    else globalThis.localStorage?.removeItem(SESSION_KEY);
    return;
  }
  if (session) await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function getOidcDiscovery(): Promise<AuthSession.DiscoveryDocument> {
  const response = await fetch(OIDC_DISCOVERY_URL);
  if (!response.ok) throw new Error('Repton sign-in details could not be loaded. Please try again.');
  const raw = await response.json() as OidcDiscovery;
  return {
    authorizationEndpoint: raw.authorization_endpoint,
    tokenEndpoint: raw.token_endpoint,
    endSessionEndpoint: raw.end_session_endpoint,
  } as AuthSession.DiscoveryDocument;
}

export function CustomerAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SavedSession | null>(null);
  const [profile, setProfile] = useState<CustomerAccountProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async (accessToken: string) => {
    const customer = await getCustomerAccountOverview(accessToken);
    setProfile(customer);
    return customer;
  }, []);

  const renewSession = useCallback(async () => {
    const nextSession = await requestCustomerSession('none');
    if (!nextSession) {
      await writeSession(null);
      setSession(null);
      setProfile(null);
      return null;
    }
    const customer = await getCustomerAccountOverview(nextSession.accessToken);
    await writeSession(nextSession);
    setSession(nextSession);
    setProfile(customer);
    return nextSession;
  }, []);

  const getUsableSession = useCallback(async () => {
    if (!session) throw new Error('Sign in to manage your account.');
    if (session.expiresAt > Date.now() + 60_000) return session;
    const renewed = await renewSession();
    if (!renewed) throw new Error('Your Repton account session ended. Please sign in again.');
    return renewed;
  }, [renewSession, session]);

  useEffect(() => {
    let active = true;
    void readSession()
      .then(async (saved) => {
        if (!saved) {
          if (active) {
            setSession(null);
            setIsLoading(false);
          }
          return;
        }
        let current = saved;
        if (current.expiresAt <= Date.now() + 60_000) {
          const renewed = await requestCustomerSession('none');
          if (!renewed) {
            await writeSession(null);
            if (active) {
              setSession(null);
              setProfile(null);
            }
            return;
          }
          current = renewed;
          await writeSession(current);
        }
        const customer = await getCustomerAccountOverview(current.accessToken);
        if (active) {
          setSession(current);
          setProfile(customer);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Your account could not be loaded.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const runAccountUpdate = useCallback(async (update: (accessToken: string) => Promise<void>) => {
    setIsWorking(true);
    setError('');
    try {
      const current = await getUsableSession();
      await update(current.accessToken);
      await loadOverview(current.accessToken);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'The account could not be updated.';
      setError(message);
      throw new Error(message);
    } finally {
      setIsWorking(false);
    }
  }, [getUsableSession, loadOverview]);

  const value = useMemo<CustomerAccountContextValue>(() => ({
    profile,
    isLoading,
    isWorking,
    error,
    isSignedIn: !!session,
    async signIn() {
      if (!CLIENT_ID) throw new Error('Repton account sign-in is not configured yet.');
      setIsWorking(true);
      setError('');
      try {
        const nextSession = await requestCustomerSession();
        if (!nextSession) return;
        const account = await getCustomerAccountOverview(nextSession.accessToken);
        await writeSession(nextSession);
        setSession(nextSession);
        setProfile(account);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Sign-in failed. Please try again.';
        setError(message);
        throw new Error(message);
      } finally {
        setIsWorking(false);
      }
    },
    async signOut() {
      if (session?.idToken) {
        try {
          const oidc = await getOidcDiscovery();
          if (oidc.endSessionEndpoint) {
            const logoutUrl = new URL(oidc.endSessionEndpoint);
            logoutUrl.searchParams.set('id_token_hint', session.idToken);
            await fetch(logoutUrl.toString());
          }
        } catch {
          // Always clear the local session even if Shopify's logout endpoint is unavailable.
        }
      }
      await writeSession(null);
      setSession(null);
      setProfile(null);
      setError('');
    },
    async refresh() {
      if (!session) return;
      setIsWorking(true);
      setError('');
      try {
        const current = await getUsableSession();
        await loadOverview(current.accessToken);
      }
      catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Your account could not be refreshed.';
        setError(message);
        throw new Error(message);
      } finally { setIsWorking(false); }
    },
    async saveProfile(firstName, lastName) {
      await runAccountUpdate(async (accessToken) => {
        const result = await updateCustomerProfile(accessToken, firstName, lastName);
        const errors = result.customerUpdate.userErrors;
        if (errors.length) throw new Error(errors.map((item) => item.message).join(' '));
      });
    },
    async saveAddress(address, addressId, makeDefault = false) {
      await runAccountUpdate(async (accessToken) => {
        if (addressId) {
          const result = await updateCustomerAddress(accessToken, addressId, address, makeDefault);
          if (result.customerAddressUpdate.userErrors.length) {
            throw new Error(result.customerAddressUpdate.userErrors.map((item) => item.message).join(' '));
          }
        } else {
          const result = await createCustomerAddress(accessToken, address, makeDefault);
          if (result.customerAddressCreate.userErrors.length) {
            throw new Error(result.customerAddressCreate.userErrors.map((item) => item.message).join(' '));
          }
        }
      });
    },
  }), [error, getUsableSession, isLoading, isWorking, loadOverview, profile, runAccountUpdate, session]);

  return <CustomerAccountContext.Provider value={value}>{children}</CustomerAccountContext.Provider>;
}

export function useCustomerAccount() {
  const value = useContext(CustomerAccountContext);
  if (!value) throw new Error('useCustomerAccount must be used within CustomerAccountProvider.');
  return value;
}
