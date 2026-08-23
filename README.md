# Kocel Rise & Fall Bot

Kocel is an Indices-only Rise/Fall trading workspace connected to Deriv.

## Features

- Deriv OAuth authentication and account balance
- Dynamic Synthetic Index discovery through `active_symbols`
- Three configured indices with independent tick streams
- Historical tick warm-up and live tick subscriptions
- One-minute entry aggregation and internal Rise/Fall strategy
- CALL/PUT proposal and authenticated contract execution
- Open-contract monitoring, settlement, history, and balance refresh
- Risk controls for stake, loss limits, cooldowns, and protection stops

## Routes

- `/` Deriv login
- `/bots/indices/trade` Trade and live market data
- `/bots/indices/history` Settled trade history
- `/bots/indices/settings` Strategy and risk settings

## Development

```bash
npm install
npm run dev
```

Required server configuration includes `KOCEL_SESSION_SECRET`. Deriv client settings can be provided with `VITE_DERIV_CLIENT_ID`, `VITE_DERIV_REDIRECT_URI`, and `VITE_DERIV_APP_ID`.

Copy `.env.example` to `.env.local` and replace `VITE_DERIV_APP_ID` with the app ID registered for the OAuth callback URL. Do not commit `.env.local`.
