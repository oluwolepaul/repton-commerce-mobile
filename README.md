# Repton Commerce Mobile

[Try the catalog and cart demo](https://oluwolepaul.github.io/repton-commerce-mobile/) · [Lint and type checks](https://github.com/oluwolepaul/repton-commerce-mobile/actions)

Select a category, add a sample product, and remove an item to see the subtotal update. This standalone browser walkthrough uses sample products and prices. To run it offline, open `docs/index.html` in a browser. The Expo app and Shopify integration are described below.

A cross-platform commerce application for construction-material discovery and purchasing workflows.

**TypeScript · React Native · Expo · Expo Router · Shopify GraphQL**

[Developer portfolio](https://github.com/oluwolepaul)

## Product features

- Category and product browsing with product detail and variant information.
- Cart state, favorites and checkout integration.
- Customer-account and order-related integration modules.
- Quotation, reinforcement pricing and delivery-related user journeys.

## Architecture

Expo Router screens → React contexts and integration modules → Shopify Storefront / Customer Account APIs → checkout handoff.

## Code map

- `src/app/` — routed screens
- `src/contexts/` — cart, favorites and customer state
- `src/lib/shopify.ts` — commerce queries and models
- `src/lib/customer-account-api.ts` — account integration
