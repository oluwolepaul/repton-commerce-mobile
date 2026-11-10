import { STORE_URL } from '@/lib/shopify';

export type CustomerAddress = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  zoneCode: string | null;
  province: string | null;
  countryCode: string | null;
  zip: string | null;
  phoneNumber: string | null;
};

export type CustomerOrderLine = {
  name: string;
  quantity: number;
  variantId: string | null;
  customAttributes: { key: string; value: string }[];
};

export type CustomerOrder = {
  id: string;
  name: string;
  processedAt: string;
  financialStatus: string | null;
  fulfillmentStatus: string;
  totalPrice: { amount: string; currencyCode: string };
  lineItems: { edges: { node: CustomerOrderLine }[] };
  fulfillments: { edges: { node: {
    status: string | null;
    estimatedDeliveryAt: string | null;
    trackingInformation: { company: string | null; number: string | null; url: string | null }[];
  } }[] };
};

export type CustomerAccountProfile = {
  id: string;
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  emailAddress: { emailAddress: string } | null;
  addresses: { edges: { node: CustomerAddress }[] };
  orders: { edges: { node: CustomerOrder }[] };
};

export type CustomerAddressInput = {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zoneCode?: string;
  countryCode?: string;
  zip?: string;
  phoneNumber?: string;
};

let customerApiUrl: string | null = null;

async function discoverCustomerApi() {
  if (customerApiUrl) return customerApiUrl;
  const response = await fetch(`${STORE_URL}/.well-known/customer-account-api`);
  if (!response.ok) throw new Error('Repton’s account service could not be reached. Please try again.');
  const discovery = await response.json() as { graphql_api?: string };
  if (!discovery.graphql_api) throw new Error('Repton’s account service did not return an API address.');
  customerApiUrl = discovery.graphql_api;
  return customerApiUrl;
}

export async function customerAccountRequest<T>(accessToken: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const endpoint = await discoverCustomerApi();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: accessToken },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error('Repton’s account service could not complete that request. Please try again.');
  const result = await response.json() as { data?: T; errors?: { message: string }[] };
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(' '));
  if (!result.data) throw new Error('Repton’s account service returned no account information.');
  return result.data;
}

const ACCOUNT_OVERVIEW_QUERY = `query ReptonCustomerAccountOverview {
  customer {
    id displayName firstName lastName emailAddress { emailAddress }
    addresses(first: 30) { edges { node {
      id firstName lastName company address1 address2 city zoneCode province countryCode zip phoneNumber
    } } }
    orders(first: 20, reverse: true) { edges { node {
      id name processedAt financialStatus fulfillmentStatus totalPrice { amount currencyCode }
      lineItems(first: 30) { edges { node { name quantity variantId customAttributes { key value } } } }
      fulfillments(first: 10) { edges { node {
        status estimatedDeliveryAt trackingInformation { company number url }
      } } }
    } } }
  }
}`;

export async function getCustomerAccountOverview(accessToken: string) {
  const data = await customerAccountRequest<{ customer: CustomerAccountProfile }>(accessToken, ACCOUNT_OVERVIEW_QUERY);
  return data.customer;
}

export async function updateCustomerProfile(accessToken: string, firstName: string, lastName: string) {
  return customerAccountRequest<{ customerUpdate: { customer: { firstName: string | null; lastName: string | null }; userErrors: { message: string }[] } }>(
    accessToken,
    `mutation ReptonCustomerUpdate($input: CustomerUpdateInput!) {
      customerUpdate(input: $input) { customer { firstName lastName } userErrors { message } }
    }`,
    { input: { firstName, lastName } },
  );
}

export async function createCustomerAddress(accessToken: string, address: CustomerAddressInput, makeDefault: boolean) {
  return customerAccountRequest<{ customerAddressCreate: { customerAddress: CustomerAddress | null; userErrors: { message: string }[] } }>(
    accessToken,
    `mutation ReptonCustomerAddressCreate($address: CustomerAddressInput!, $defaultAddress: Boolean) {
      customerAddressCreate(address: $address, defaultAddress: $defaultAddress) {
        customerAddress { id firstName lastName company address1 address2 city zoneCode province countryCode zip phoneNumber }
        userErrors { message }
      }
    }`,
    { address, defaultAddress: makeDefault },
  );
}

export async function updateCustomerAddress(accessToken: string, addressId: string, address: CustomerAddressInput, makeDefault: boolean) {
  return customerAccountRequest<{ customerAddressUpdate: { customerAddress: CustomerAddress | null; userErrors: { message: string }[] } }>(
    accessToken,
    `mutation ReptonCustomerAddressUpdate($address: CustomerAddressInput, $addressId: ID!, $defaultAddress: Boolean) {
      customerAddressUpdate(address: $address, addressId: $addressId, defaultAddress: $defaultAddress) {
        customerAddress { id firstName lastName company address1 address2 city zoneCode province countryCode zip phoneNumber }
        userErrors { message }
      }
    }`,
    { address, addressId, defaultAddress: makeDefault },
  );
}
