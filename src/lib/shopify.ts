export const STORE_URL = 'https://www.reptongroup.ng';

const API_VERSION = '2026-10';
const STOREFRONT_API_URL = `${STORE_URL}/api/${API_VERSION}/graphql.json`;

export type StoreCategory = 'Cement' | 'Steel' | 'Binding wire';

export type StoreProduct = {
  id: string;
  title: string;
  handle: string;
  category: StoreCategory;
  detail: string;
  imageUrl: string | null;
  priceLabel: string;
  productUrl: string;
  availableForSale: boolean;
  variantId: string | null;
};

export type StoreVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  quantityRule: { minimum: number; increment: number; maximum: number | null };
};

export type StoreProductDetails = {
  id: string;
  title: string;
  handle: string;
  description: string;
  images: { url: string; altText: string | null }[];
  variants: StoreVariant[];
};

export type ShopifyCartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    availableForSale: boolean;
    product: {
      title: string;
      handle: string;
      featuredImage: { url: string; altText: string | null } | null;
    };
    price: { amount: string; currencyCode: string };
  };
  attributes: { key: string; value: string }[];
};

export type ShopifyCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: { amount: string; currencyCode: string } };
  lines: { edges: { node: ShopifyCartLine }[] };
};

export type DeliveryEstimateAddress = { city: string; state: string; street?: string; postalCode?: string };
export type DeliveryOptionEstimate = {
  title: string | null;
  description: string | null;
  deliveryMethodType: string;
  estimatedCost: { amount: string; currencyCode: string };
};

type DeliveryGroupsResponse = {
  cartDeliveryAddressesAdd?: {
    cart: { deliveryGroups: { edges: { node: { deliveryOptions: DeliveryOptionEstimate[] } }[] } } | null;
    userErrors: { message: string }[];
  };
  cartDeliveryAddressesUpdate?: {
    cart: { deliveryGroups: { edges: { node: { deliveryOptions: DeliveryOptionEstimate[] } }[] } } | null;
    userErrors: { message: string }[];
  };
};

type CartDeliveryAddressesResponse = {
  cart: { delivery: { addresses: { id: string; selected: boolean; oneTimeUse: boolean }[] } } | null;
};

type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  productType: string;
  availableForSale: boolean;
  featuredImage: { url: string; altText: string | null } | null;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  variants: {
    edges: { node: { id: string; title: string; availableForSale: boolean; price: { amount: string; currencyCode: string } } }[];
  };
};

type ProductCollection = {
  products: {
    edges: { node: ShopifyProductNode }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
} | null;

type HomeCatalogResponse = {
  cement: ProductCollection;
  reinforcement: ProductCollection;
  bindingWire: ProductCollection;
};

type StorefrontResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

const PRODUCT_FIELDS = `
  id
  title
  handle
  productType
  availableForSale
  featuredImage {
    url
    altText
  }
  priceRange {
    minVariantPrice {
      amount
      currencyCode
    }
  }
  variants(first: 10) {
    edges {
      node {
        id
        title
        availableForSale
        price {
          amount
          currencyCode
        }
      }
    }
  }
`;

const PRODUCT_DETAILS_QUERY = `
  query ReptonProductDetails($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      images(first: 8) {
        edges { node { url altText } }
      }
      variants(first: 50) {
        edges {
          node {
            id
            title
            availableForSale
            price { amount currencyCode }
            quantityRule { minimum increment maximum }
          }
        }
      }
    }
  }
`;

type ProductDetailsResponse = {
  product: {
    id: string;
    title: string;
    handle: string;
    description: string;
    images: { edges: { node: { url: string; altText: string | null } }[] };
    variants: { edges: { node: StoreVariant }[] };
  } | null;
};

export async function getProductDetails(handle: string): Promise<StoreProductDetails | null> {
  const data = await storefrontRequest<ProductDetailsResponse>(PRODUCT_DETAILS_QUERY, { handle });
  if (!data.product) return null;
  return {
    id: data.product.id,
    title: data.product.title,
    handle: data.product.handle,
    description: data.product.description,
    images: data.product.images.edges.map(({ node }) => node),
    variants: data.product.variants.edges.map(({ node }) => node),
  };
}

const CATALOG_PAGE_QUERY = `
  query ReptonCatalogPage($cementAfter: String, $reinforcementAfter: String, $bindingWireAfter: String, $fetchCement: Boolean!, $fetchReinforcement: Boolean!, $fetchBindingWire: Boolean!) {
    cement: collection(handle: "cements") @include(if: $fetchCement) {
      products(first: 8, after: $cementAfter) {
        pageInfo { hasNextPage endCursor }
        edges {
          node { ${PRODUCT_FIELDS} }
        }
      }
    }
    reinforcement: collection(handle: "reinforcements") @include(if: $fetchReinforcement) {
      products(first: 8, after: $reinforcementAfter) {
        pageInfo { hasNextPage endCursor }
        edges {
          node { ${PRODUCT_FIELDS} }
        }
      }
    }
    bindingWire: collection(handle: "binding-wire") @include(if: $fetchBindingWire) {
      products(first: 8, after: $bindingWireAfter) {
        pageInfo { hasNextPage endCursor }
        edges {
          node { ${PRODUCT_FIELDS} }
        }
      }
    }
  }
`;

async function storefrontRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(STOREFRONT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new Error('Could not connect to Repton Group’s product service.');
  }

  if (!response.ok) {
    throw new Error(`Repton Group’s product service returned ${response.status}.`);
  }

  const result = (await response.json()) as StorefrontResponse<T>;
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(' '));
  }
  if (!result.data) {
    throw new Error('Repton Group’s product service returned no catalog data.');
  }

  return result.data;
}

function formatPrice(amount: string, currencyCode: string) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return `${currencyCode} ${amount}`;

  if (currencyCode === 'NGN') {
    return `₦${numericAmount.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;
  }

  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

function mapProducts(collection: ProductCollection, category: StoreCategory): StoreProduct[] {
  return (collection?.products.edges ?? []).map(({ node }) => {
    const firstVariant = node.variants.edges.find(({ node: variant }) => variant.availableForSale)?.node ?? node.variants.edges[0]?.node;
    const detail =
      firstVariant?.title && firstVariant.title !== 'Default Title'
        ? firstVariant.title
        : node.productType || category;

    return {
      id: node.id,
      title: node.title,
      handle: node.handle,
      category,
      detail,
      imageUrl: node.featuredImage?.url ?? null,
      priceLabel: formatPrice(
        firstVariant?.price.amount ?? node.priceRange.minVariantPrice.amount,
        firstVariant?.price.currencyCode ?? node.priceRange.minVariantPrice.currencyCode,
      ),
      productUrl: `${STORE_URL}/products/${node.handle}`,
      availableForSale: node.availableForSale,
      variantId: firstVariant?.id ?? null,
    };
  });
}

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost {
    subtotalAmount {
      amount
      currencyCode
    }
  }
  lines(first: 50) {
    edges {
      node {
        id
        quantity
        attributes { key value }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            product {
              title
              handle
              featuredImage { url altText }
            }
            price { amount currencyCode }
          }
        }
      }
    }
  }
`;

type CartPayload = { cartCreate?: { cart: ShopifyCart | null; userErrors: { message: string }[] }; cartLinesAdd?: { cart: ShopifyCart | null; userErrors: { message: string }[] }; cartLinesUpdate?: { cart: ShopifyCart | null; userErrors: { message: string }[] }; cartLinesRemove?: { cart: ShopifyCart | null; userErrors: { message: string }[] } };

async function cartMutation<T extends keyof CartPayload>(query: string, variables: Record<string, unknown>, payloadName: T) {
  const data = await storefrontRequest<CartPayload>(query, variables);
  const payload = data[payloadName];
  if (!payload) throw new Error('Shopify did not return the updated cart.');
  if (payload.userErrors.length) throw new Error(payload.userErrors.map((error) => error.message).join(' '));
  if (!payload.cart) throw new Error('Shopify did not return the updated cart.');
  return payload.cart;
}

const CART_CREATE = `mutation ReptonCartCreate($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } userErrors { message } } }`;
const CART_LINES_ADD = `mutation ReptonCartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`;
const CART_LINES_UPDATE = `mutation ReptonCartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } } }`;
const CART_LINES_REMOVE = `mutation ReptonCartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ${CART_FIELDS} } userErrors { message } } }`;
const GET_CART = `query ReptonGetCart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`;

export async function getCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await storefrontRequest<{ cart: ShopifyCart | null }>(GET_CART, { id: cartId });
  return data.cart;
}

const CART_DELIVERY_ADDRESSES_QUERY = `query ReptonCartDeliveryAddresses($id: ID!) {
  cart(id: $id) {
    delivery { addresses { id selected oneTimeUse } }
  }
}`;

const DELIVERY_GROUPS_FIELDS = `deliveryGroups(first: 10) {
  edges { node { deliveryOptions { title description deliveryMethodType estimatedCost { amount currencyCode } } } }
}`;

const CART_DELIVERY_ADDRESS_ADD = `mutation ReptonCartDeliveryAddressAdd($id: ID!, $addresses: [CartSelectableAddressInput!]!) {
  cartDeliveryAddressesAdd(cartId: $id, addresses: $addresses) {
    userErrors { message }
    cart { ${DELIVERY_GROUPS_FIELDS} }
  }
}`;

const CART_DELIVERY_ADDRESS_UPDATE = `mutation ReptonCartDeliveryAddressUpdate($id: ID!, $addresses: [CartSelectableAddressUpdateInput!]!) {
  cartDeliveryAddressesUpdate(cartId: $id, addresses: $addresses) {
    userErrors { message }
    cart { ${DELIVERY_GROUPS_FIELDS} }
  }
}`;

export async function estimateCartDelivery(cartId: string, address: DeliveryEstimateAddress): Promise<DeliveryOptionEstimate[]> {
  const current = await storefrontRequest<CartDeliveryAddressesResponse>(CART_DELIVERY_ADDRESSES_QUERY, { id: cartId });
  if (!current.cart) throw new Error('Your bag could not be found. Please refresh and try again.');

  const existingTemporaryAddress = current.cart.delivery.addresses.find((item) => item.oneTimeUse);
  const stateName = address.state.trim().toLowerCase().replace(/\s+/g, ' ');
  const nigerianProvinceCodes: Record<string, string> = {
    abia: 'AB', adamawa: 'AD', 'akwa ibom': 'AK', anambra: 'AN', bauchi: 'BA', bayelsa: 'BY',
    benue: 'BE', borno: 'BO', 'cross river': 'CR', delta: 'DE', ebonyi: 'EB', edo: 'ED', ekiti: 'EK',
    enugu: 'EN', 'federal capital territory': 'FC', fct: 'FC', abuja: 'FC', gombe: 'GO', imo: 'IM',
    jigawa: 'JI', kaduna: 'KD', kano: 'KN', katsina: 'KT', kebbi: 'KE', kogi: 'KO', kwara: 'KW',
    lagos: 'LA', nasarawa: 'NA', nassarawa: 'NA', niger: 'NI', ogun: 'OG', ondo: 'ON', osun: 'OS',
    oyo: 'OY', plateau: 'PL', rivers: 'RI', sokoto: 'SO', taraba: 'TA', yobe: 'YO', zamfara: 'ZA',
  };
  const deliveryAddress = {
    city: address.city.trim(),
    provinceCode: nigerianProvinceCodes[stateName] ?? address.state.trim().toUpperCase(),
    countryCode: 'NG',
    ...(address.street?.trim() ? { address1: address.street.trim() } : {}),
    ...(address.postalCode?.trim() ? { zip: address.postalCode.trim() } : {}),
  };

  const result = existingTemporaryAddress
    ? await storefrontRequest<DeliveryGroupsResponse>(CART_DELIVERY_ADDRESS_UPDATE, {
        id: cartId,
        addresses: [{ id: existingTemporaryAddress.id, selected: true, oneTimeUse: true, address: { deliveryAddress } }],
      })
    : await storefrontRequest<DeliveryGroupsResponse>(CART_DELIVERY_ADDRESS_ADD, {
        id: cartId,
        addresses: [{ selected: true, oneTimeUse: true, address: { deliveryAddress } }],
      });

  const payload = result.cartDeliveryAddressesUpdate ?? result.cartDeliveryAddressesAdd;
  if (!payload) throw new Error('Repton could not calculate delivery for that location.');
  if (payload.userErrors.length) throw new Error(payload.userErrors.map((error) => error.message).join(' '));
  return payload.cart?.deliveryGroups.edges.flatMap(({ node }) => node.deliveryOptions) ?? [];
}

export function createCart(variantId: string, quantity: number, minimumQuantity: number, minimumLabel: string, increment: number) {
  return cartMutation(CART_CREATE, {
    lines: [{ merchandiseId: variantId, quantity, attributes: [
      { key: 'minimum_quantity', value: String(minimumQuantity) },
      { key: 'minimum_order_label', value: minimumLabel },
      { key: 'quantity_increment', value: String(increment) },
    ] }],
  }, 'cartCreate');
}

export function addCartLine(cartId: string, variantId: string, quantity: number, minimumQuantity: number, minimumLabel: string, increment: number) {
  return cartMutation(CART_LINES_ADD, {
    cartId,
    lines: [{ merchandiseId: variantId, quantity, attributes: [
      { key: 'minimum_quantity', value: String(minimumQuantity) },
      { key: 'minimum_order_label', value: minimumLabel },
      { key: 'quantity_increment', value: String(increment) },
    ] }],
  }, 'cartLinesAdd');
}

export function updateCartLine(cartId: string, lineId: string, quantity: number) {
  return cartMutation(CART_LINES_UPDATE, { cartId, lines: [{ id: lineId, quantity }] }, 'cartLinesUpdate');
}

export function removeCartLine(cartId: string, lineId: string) {
  return cartMutation(CART_LINES_REMOVE, { cartId, lineIds: [lineId] }, 'cartLinesRemove');
}

export function formatCartPrice(amount: string, currencyCode: string) {
  return formatPrice(amount, currencyCode);
}

export type CatalogCursors = {
  cement: string | null;
  reinforcement: string | null;
  bindingWire: string | null;
  hasMoreCement: boolean;
  hasMoreReinforcement: boolean;
  hasMoreBindingWire: boolean;
};

export type CatalogPage = {
  products: StoreProduct[];
  nextCursors: CatalogCursors;
  hasMore: boolean;
};

export async function getCatalogPage(cursors?: Partial<CatalogCursors>): Promise<CatalogPage> {
  const data = await storefrontRequest<HomeCatalogResponse>(CATALOG_PAGE_QUERY, {
    cementAfter: cursors?.cement ?? null,
    reinforcementAfter: cursors?.reinforcement ?? null,
    bindingWireAfter: cursors?.bindingWire ?? null,
    fetchCement: cursors?.hasMoreCement ?? true,
    fetchReinforcement: cursors?.hasMoreReinforcement ?? true,
    fetchBindingWire: cursors?.hasMoreBindingWire ?? true,
  });
  const cementProducts = mapProducts(data.cement, 'Cement');
  const steelProducts = mapProducts(data.reinforcement, 'Steel');
  const bindingWireProducts = mapProducts(data.bindingWire, 'Binding wire');
  const seen = new Set<string>();

  const products = [...cementProducts, ...steelProducts, ...bindingWireProducts].filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });

  const nextCursors = {
    cement: data.cement?.products.pageInfo.endCursor ?? null,
    reinforcement: data.reinforcement?.products.pageInfo.endCursor ?? null,
    bindingWire: data.bindingWire?.products.pageInfo.endCursor ?? null,
    hasMoreCement: data.cement?.products.pageInfo.hasNextPage ?? false,
    hasMoreReinforcement: data.reinforcement?.products.pageInfo.hasNextPage ?? false,
    hasMoreBindingWire: data.bindingWire?.products.pageInfo.hasNextPage ?? false,
  };

  const hasMore = nextCursors.hasMoreCement || nextCursors.hasMoreReinforcement || nextCursors.hasMoreBindingWire;

  return {
    products,
    nextCursors,
    hasMore,
  };
}

export async function getHomeCatalog(): Promise<StoreProduct[]> {
  const page = await getCatalogPage();
  return page.products;
}
