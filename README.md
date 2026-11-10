# Repton Commerce Mobile

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
- `src/lib/native-checkout.ts` — checkout handoff

## Run locally

Use a Node version compatible with the Expo version in `package.json`. Run `npm ci`, then `npm run start`. Run `npm run lint` and `npx tsc --noEmit` for static checks. Native checkout and other native modules may require a development build. Configure your own Shopify store and application registration before testing authenticated commerce flows; use sandbox/test transactions. No production customer data is supplied.

## Status and limitations

This is an implementation snapshot. The presence of checkout and account integration code does not demonstrate completion of a real purchase or store approval. External storefront availability, account registration, payment configuration, and device builds must be validated in the intended environment.

## Engineering discussion

This project provides examples of connecting user journeys to data, handling state and failure paths, and working within platform constraints. It was developed with AI-assisted tooling. Features are described from source and project records; unmeasured business outcomes, usage counts and performance claims are intentionally omitted.

## Rights and configuration

Published with the project owner's permission. Brand assets and third-party components retain their respective rights. See any included license and third-party notices. Public visibility does not grant a new license to third-party artwork or content. Runtime credentials and private customer information are not included.
