# Kocel Scalper Bot

MASTER IMPLEMENTATION PROMPT — KOCEL RISE & FALL BOT

PHASE 1: UI FOUNDATION + DERIV LOGIN & AUTHENTICATION

IMPORTANT — READ BEFORE IMPLEMENTATION

Build PHASE 1 ONLY of a larger application called:

Kocel Rise & Fall Bot

This is the foundation phase for a future automated Rise/Fall scalping platform that will eventually contain two completely separate trading systems:

Forex Scalper Bot

Indices Scalper Bot

Do NOT implement the trading engines, strategies, market scanners, automated trade execution, risk engine, or bot-selection functionality in this phase.

Phase 1 must establish a professional, production-ready UI foundation and a working Deriv account authentication/login system so that later phases can build directly on top of it.

Do not create fake trading functionality simply to make the interface appear complete.



1. CORE OBJECTIVE

Create the complete Phase 1 application shell with:

Kocel Rise & Fall Bot branding

Modern professional trading UI

Fully responsive design

Deriv account login

Proper Deriv OAuth authentication

Secure authenticated session

Demo/Real account detection

User/account information

Balance display

Connection status

Logout

Authentication error handling

Loading states

Connection/reconnection states

Protected application area

Foundation for the Phase 2 Bot Selection screen

The application must be structured so that Phase 2 can be added without rebuilding Phase 1.



2. DO NOT BUILD THE FOLLOWING IN PHASE 1

Do NOT implement:

Forex trading strategy

Synthetic Indices trading strategy

Rise/Fall signal generation

Market scanner

Automated trading

Contract purchase

Stake calculation

Duration calculation

Entry engine

Confidence engine

Risk engine

Capital protection logic

Maximum-loss logic

Consecutive-loss logic

Daily-loss logic

Backtesting

Trade execution

AI prediction engine

Bot selection functionality

These belong to later phases.

You may create empty routes/placeholders for future functionality if necessary, but they must clearly indicate that the functionality will be implemented in a later phase.



3. APPLICATION BRANDING

Application name:

Kocel Scalper Tool

Primary branding should feel like a professional trading/scalping platform rather than a generic website.

Use a modern trading dashboard aesthetic.

Suggested visual direction:

Dark professional trading interface

Clean cards

Rounded corners

Subtle borders

Good spacing

Clear typography

Strong visual hierarchy

Professional status indicators

Responsive layout

Minimal unnecessary decoration

Use colors that clearly distinguish:

Primary brand

Success

Warning

Error

Information

Connected

Disconnected

Demo

Real

Do not make the interface excessively colorful.

The UI must remain readable and professional.



4. RESPONSIVE DESIGN

The application must work properly on:

Desktop

Laptop

Tablet

Android phones

iPhone

Small mobile screens

Large monitors

Do not simply shrink the desktop UI.

Create proper responsive layouts.

On mobile:

Navigation should collapse appropriately

Cards should stack

Buttons should remain easily tappable

Account information should remain readable

Login should fit the screen

No horizontal scrolling

Tables/data should become responsive

Important controls should remain accessible



5. APPLICATION STRUCTURE

Create a clean application architecture.

The structure should support future phases.

Recommended conceptual structure:

Kocel Rise & Fall Bot

│

├── Authentication

│   ├── Login

│   ├── OAuth Callback

│   ├── Session

│   └── Logout

│

├── Application Shell

│   ├── Header

│   ├── Navigation

│   ├── Account Panel

│   └── Main Content

│

├── Future Bot Selection

│

├── Future Forex Scalper

│

├── Future Indices Scalper

│

└── Shared Components

Use reusable components wherever appropriate.

Do not create unnecessarily duplicated code.



6. LANDING / LOGIN SCREEN

The first screen for an unauthenticated user should be the Kocel login screen.

Design it professionally.

Include:

Logo / Brand

KOCEL

Rise & Fall Bot

Main heading

Trade Smarter. Scalp Faster.

or an equally professional heading.

Supporting text

Explain briefly that the platform connects to the user’s Deriv account and will provide access to specialized Rise/Fall scalping bots.

Do not make unrealistic profit promises.

Do not claim guaranteed profits.



7. DERIV LOGIN BUTTON

The primary action must be:

Login with Deriv

Use a large, prominent button.

Example:

[ Login with Deriv ]

The button should have:

Appropriate icon if available

Hover state

Active state

Loading state

Disabled state

Error state

When clicked, begin the proper Deriv authentication process.

Do not create a fake username/password login system.

Do not ask users to enter their Deriv password into the Kocel application.



8. DERIV AUTHENTICATION

Implement the proper Deriv-supported OAuth authentication flow.

The authentication architecture must be designed so that:

User clicks Login with Deriv.

User is redirected to Deriv’s official authentication/authorization page.

User authenticates with Deriv.

Deriv redirects the user back to the configured Kocel callback URL.

Kocel validates/processes the authentication response.

A secure application session is established.

The authenticated account becomes available to the application.

User is redirected into the authenticated application shell.

Do not collect or store the user’s Deriv password.

Do not expose OAuth secrets in frontend code.

Do not hardcode private credentials.

Use environment variables/configuration for secrets and credentials.



9. OAUTH CONFIGURATION

Create a clear configuration system for the Deriv OAuth integration.

Use environment variables for values such as:

DERIV_CLIENT_ID

DERIV_CLIENT_SECRET

DERIV_REDIRECT_URI

DERIV_OAUTH_URL

Use the exact names appropriate to the final implementation if the chosen Deriv authentication SDK/API requires different naming.

Never expose:

Client secrets

API secrets

Private keys

Server credentials

inside publicly accessible frontend JavaScript.



10. CALLBACK ROUTE

Create a dedicated authentication callback route.

For example:

/auth/callback

or an equivalent route appropriate for the selected framework.

The callback must handle:

Successful authentication

→ Validate response
→ Establish session
→ Load account information
→ Redirect to authenticated application

Failed authentication

→ Display a useful error
→ Do not create a partial session

User cancels authentication

→ Return safely to login

Invalid/expired response

→ Reject it safely
→ Ask the user to authenticate again



11. SESSION MANAGEMENT

After successful authentication, establish a secure session.

The session should contain only information necessary for the application.

Do not unnecessarily store sensitive information.

Implement:

Session creation

Session validation

Session expiration handling

Logout

Authentication state persistence

Protected routes

Unauthorized-route handling

If the session expires:

Your Deriv session has expired.



[ Reconnect ]

Do not silently continue as if the user were authenticated.



12. AUTHENTICATED APPLICATION SHELL

After login, display the main authenticated application shell.

Phase 1 should create the shell that Phase 2 will use.

Header

Include:

Kocel Rise & Fall Bot

Account information:

Account: DEMO

ID: CR123456

Balance: $100.00

● Connected

The exact account fields must come from the authenticated Deriv account.

Do not fabricate values.



13. ACCOUNT TYPE

Clearly identify whether the authenticated account is:

DEMO

or

REAL

Use visually distinct status indicators.

Example:

DEMO ACCOUNT

or

REAL ACCOUNT

Do not misrepresent the account type.

If the Deriv authentication response provides multiple authorized accounts, design the architecture so account selection can be added cleanly in a later phase.

Do not unnecessarily implement complex account switching unless required by the actual authentication flow.



14. ACCOUNT BALANCE

After authentication, retrieve the authenticated account’s available balance through the appropriate Deriv API mechanism.

Display:

Balance

Currency

Account ID

Account type

Connection status

Example:

ACCOUNT



Balance

$100.00 USD



Account

CR123456



Type

DEMO



Status

● CONNECTED

The balance must be live data.

Do not use hardcoded demo values in the authenticated dashboard.



15. CONNECTION STATUS

Create a persistent connection-status component.

Possible states:

Connected

● Connected

Connecting

◌ Connecting...

Reconnecting

↻ Reconnecting...

Disconnected

● Disconnected

The UI must update according to the actual connection state.

Do not display “Connected” when the Deriv connection is unavailable.



16. RECONNECTION HANDLING

Prepare the application for unstable Internet connections.

If the connection drops:

Detect disconnection.

Update UI.

Attempt reconnection according to a sensible strategy.

Show reconnection status.

Restore required subscriptions/session state after reconnection.

Avoid creating duplicate connections.

Example:

Connection lost.



Reconnecting...

Attempt 2

Once restored:

Connection restored.



17. LOGOUT

Add a clearly accessible:

Logout

button.

When clicked:

Terminate the application session.

Disconnect relevant live connections.

Clear temporary authenticated state.

Return to the login page.

The user must not remain inside protected screens after logout.



18. ERROR HANDLING

Create professional error messages.

Examples:

Authentication failed

Unable to authenticate with Deriv.

Please try again.

Connection failure

Unable to connect to Deriv.

Check your internet connection and try again.

Session expired

Your session has expired.

Please reconnect your Deriv account.

API error

Deriv connection error.

Please try again.

Avoid exposing raw technical errors, secrets, tokens, stack traces, or internal implementation details to users.

Technical errors should be logged safely for development/debugging.



19. LOADING STATES

Every asynchronous action must have an appropriate loading state.

Examples:

Connecting to Deriv...

Loading account...

Refreshing connection...

Buttons must not allow repeated clicks that create duplicate authentication attempts or duplicate connections.



20. AUTHENTICATION GUARD

Protected application routes must require authentication.

If an unauthenticated user attempts to access:

/dashboard

or any future bot route:

/forex

/indices

/settings

redirect them to:

/login

Phase 1 should establish this mechanism even though the future bot routes are not yet implemented.



21. FUTURE-PROOF ROUTING

Prepare routes for later phases.

Conceptually:

/login

/auth/callback

/dashboard



/bots



/forex

/forex/settings

/forex/trades

/forex/history



/indices

/indices/settings

/indices/trades

/indices/history

In Phase 1, only implement the routes required for authentication and the application shell.

Do not build the future bot pages yet.



22. DASHBOARD PLACEHOLDER

After successful authentication, Phase 1 may show a temporary welcome dashboard.

Example:

Welcome to Kocel Rise & Fall Bot



Your Deriv account is connected.



Account

DEMO



Balance

$100.00



Connection

● Connected



Next

Select your trading bot.

However, the actual Forex Scalper Bot / Indices Scalper Bot selection interface belongs to Phase 2.

Do not implement the Phase 2 selection cards yet.



23. SECURITY REQUIREMENTS

Security is mandatory.

Do not:

Store Deriv passwords.

Expose OAuth secrets.

Put private credentials in frontend source.

Hardcode authentication tokens.

Log authentication secrets.

Store sensitive tokens unnecessarily.

Trust client-side authentication state without server validation where server-side authentication is used.

Use:

HTTPS-ready configuration

Secure cookies where applicable

HttpOnly cookies for server-managed sessions where appropriate

SameSite protection

CSRF protection where applicable

Input validation

Proper OAuth state/PKCE mechanisms where supported/appropriate

Secure environment variables

Proper error handling

Follow the actual Deriv authentication/API requirements rather than inventing an authentication protocol.



24. NO FAKE DATA

This is extremely important.

Do not use fake:

Balance

Account ID

Connection status

Trade status

Authentication status

Market price

Profit

Loss

Contract information

If the real data is unavailable, display:

Not available

or an appropriate loading/error state.



25. UI COMPONENT FOUNDATION

Create reusable components for future phases, including:

Header

Sidebar/navigation

Account card

Balance card

Status badge

Loading spinner

Error alert

Modal

Button

Card

Tabs

Dropdown

Toggle

Settings row

Responsive data container

These components should be reusable by both Forex and Indices bots later.



26. DESIGN FOR FUTURE BOT-SPECIFIC SETTINGS

Do not implement the settings in Phase 1, but establish the architecture so each bot will eventually have independent configuration.

Future structure:

FOREX SETTINGS

    ├── Stake

    ├── Maximum Loss Per Trade

    ├── Maximum Consecutive Losses

    ├── Daily Loss Limit

    ├── Capital Protection

    ├── Confidence Threshold

    └── Other Forex Controls



INDICES SETTINGS

    ├── Stake

    ├── Maximum Loss Per Trade

    ├── Maximum Consecutive Losses

    ├── Daily Loss Limit

    ├── Capital Protection

    ├── Confidence Threshold

    └── Other Indices Controls

Do not combine these settings into one global risk configuration.



27. DATABASE / STORAGE FOUNDATION

If the chosen architecture requires a database, prepare the schema for future phases.

At minimum, design the architecture so the system can later store:

Users

Internal user ID

Deriv account ID

Account type

Currency

Created date

Last login

Status

Bot configuration

Separate configuration for:

Forex

Indices

Future trades

Prepare the architecture for:

Bot type

Market

Contract type

Direction

Stake

Duration

Entry

Result

Profit/loss

Timestamp

Do not implement trading records yet.

Do not store unnecessary sensitive authentication information.



28. APPLICATION STATES

Implement clear application states:

UNAUTHENTICATED

      ↓

AUTHENTICATING

      ↓

AUTHENTICATED

      ↓

CONNECTING

      ↓

CONNECTED

And error/recovery states:

AUTH ERROR

CONNECTION ERROR

SESSION EXPIRED

DISCONNECTED

RECONNECTING

The UI must accurately reflect these states.



29. MOBILE UI

On mobile, the login screen should be extremely clean.

Example structure:

        KOCEL



  RISE & FALL BOT



Trade smarter.

Scalp with precision.



┌──────────────────────┐

│   Login with Deriv   │

└──────────────────────┘



Secure authentication

via Deriv

Do not overcrowd the mobile screen.



30. DESKTOP UI

On desktop, create a polished centered authentication experience with a professional background/dashboard aesthetic.

After authentication, use a full-width dashboard shell suitable for later trading interfaces.

The UI should feel like a real trading application.



31. ACCESSIBILITY

Implement:

Keyboard navigation

Visible focus states

Proper button labels

Accessible form elements

Good color contrast

Screen-reader-friendly labels where appropriate

No information conveyed by color alone



32. PERFORMANCE

The application should:

Load quickly

Avoid unnecessary API calls

Avoid duplicate WebSocket connections

Clean up connections on logout/unmount

Avoid memory leaks

Avoid unnecessary UI re-renders

Handle reconnection efficiently



33. CODE QUALITY

Use clean, maintainable architecture.

Requirements:

Modular components

Reusable services

Clear naming

Environment configuration

Separation of UI and authentication logic

Separation of Deriv API logic

Centralized error handling

Centralized connection management

No unnecessary duplicated code

No hardcoded secrets

No fake implementations presented as real functionality

Document important authentication/API decisions.



34. FUTURE PHASE COMPATIBILITY

The Phase 1 implementation must make it easy to add:

Phase 2

Bot selection + complete individual bot dashboards.

Phase 3

Live market data + scanners.

Phase 4

Forex strategy engine.

Phase 5

Synthetic Indices strategy engine.

Phase 6

Rise/Fall execution engine.

Phase 7

Bot-specific risk/settings.

Phase 8

Full automation, monitoring and optimization.

Do not make architectural decisions in Phase 1 that prevent these phases from being implemented independently.



35. FINAL PHASE 1 ACCEPTANCE TEST

Phase 1 is complete only when all of the following work:

Application loads correctly.

Login screen is responsive.

Kocel branding is displayed correctly.

“Login with Deriv” starts the proper authentication process.

User is redirected to Deriv authentication.

User can successfully authenticate.

OAuth callback works.

Authentication errors are handled.

User session is established securely.

Authenticated dashboard loads.

Real account information is retrieved.

Account ID is displayed correctly.

Demo/Real account status is displayed correctly.

Live account balance is displayed.

Connection status is accurate.

Connection loss is detected.

Reconnection is handled.

Logout works.

Protected routes reject unauthenticated users.

No Deriv password is stored by Kocel.

No secret credentials are exposed in frontend code.

No fake balance or fake connection status is used.

No trading is executed.

No trading strategy is implemented.

No risk-management logic is implemented.

The application is ready for Phase 2.



36. PHASE 1 COMPLETION RULE

When Phase 1 is finished, STOP.

Provide a concise implementation report showing:

What was implemented.

Authentication method used.

Routes created.

Deriv integration status.

Session/authentication status.

Any environment variables required.

Any callback URL that must be configured in the Deriv developer application.

Any remaining configuration required before Phase 2.

The application must be left in a stable, working state ready for the next phase



Deriv app id: 34az2gX5h2arQ46I58tEI

Redirect URLs: https://kocelscalpertool.lovable.app/oauth/callback



This is the guidelines to follow for implementing the authentication method for this application “[Getting Started](/docs/)

# OAuth 2.0

A complete guide to implementing Login and Sign Up using Deriv's OAuth 2.0 Authorization Code flow with PKCE.

## How the flow works

1

Generate PKCE

2

Redirect to Deriv

3

User Authenticates

4

Exchange Code

5

Use Token

1. **Generate PKCE —** Create a `code_verifier` (random string) and derive `code_challenge` = BASE64URL(SHA256(code_verifier)). Also generate a random `state` for CSRF protection.

2. **Redirect to Deriv —** Send the user to Deriv's authorization URL with all required parameters.

3. **User authenticates —** Deriv shows either the login or registration form. All login and consent screens are managed by the OAuth provider.

4. **Redirect back —** Deriv redirects the user to your `redirect_uri` with an authorization `code` and `state`.

5. **Verify state —** Confirm the returned `state` matches what you stored. This prevents CSRF attacks.

6. **Exchange code for token —** Your backend sends the `code` + `code_verifier` to Deriv's token endpoint and receives an `access_token`.

7. **Use the token —** Make authenticated API calls using the Bearer token.

## Before you start

You need:

- A registered OAuth2 client from Deriv with a `client_id` and a pre-registered `redirect_uri`.

- HTTPS enabled on your redirect URL.

- Your app must handle redirects, read the authorization code, and exchange it for tokens.

## Step 1: Generate PKCE parameters

##### What is PKCE?

**PKCE** (Proof Key for Code Exchange, pronounced 'pixy') prevents authorization code interception attacks. Even if an attacker intercepts the authorization code, they cannot exchange it without the original `code_verifier` that only your app generated and stored.

| Term | What it is |

| --- | --- |

| `code_verifier` | A cryptographically random string (43–128 characters) generated by your app |

| `code_challenge` | `BASE64URL(SHA256(code_verifier))` — sent with the authorization request |

| `code_challenge_method` | Always S256 (SHA-256) |

**Why it works:** Only the app that generated the `code_verifier` can complete the token exchange.

### Generating PKCE in JavaScript

```javascript

// 1. Generate a random code_verifier

const array = crypto.getRandomValues(new Uint8Array(64));

const codeVerifier = Array.from(array)

  .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])

  .join('');

// 2. Derive the code_challenge

const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));

const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))

  .replace(/\+/g, '-')

  .replace(/\//g, '_')

  .replace(/=+$/, '');

// 3. Generate a random state for CSRF protection

const state = crypto.getRandomValues(new Uint8Array(16))

  .reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');

// 4. Store code_verifier and state before redirecting

sessionStorage.setItem('pkce_code_verifier', codeVerifier);

sessionStorage.setItem('oauth_state', state);

```

Required authorization request parameters:

- response_type=code

- client_id

- redirect_uri

- scope

- state

- code_challenge + code_challenge_method=S256 (PKCE)

##### Storage tip

Store the `code_verifier` and `state` in `sessionStorage` before redirecting — they survive the redirect and are automatically cleared when the tab is closed. Clear them from storage immediately after a successful token exchange.

## Step 2: Redirect the user to the authorization endpoint

Send users to Deriv's OAuth 2.0 authorization endpoint:

```bash

https://auth.deriv.com/oauth2/auth

```

### Login

Login uses the standard OAuth2 + PKCE parameters with no additions.

#### Parameters

| Parameter | Value | Description |

| --- | --- | --- |

| `response_type` Required | `code` | Request an authorization code |

| `client_id` Required | `Your app ID` | Registered OAuth2 application ID from Deriv |

| `redirect_uri` Required | `Your callback URL` | Must exactly match the URI registered with Deriv |

| `scope` Required | `trade` `account_manage` `application_read` `payment` | Space-separated list of the permissions your app requests — see the OAuth scopes table below |

| `state` Required | `Random string` | CSRF protection — generate a new value for each request |

| `code_challenge` Required | `BASE64URL(SHA256(verifier))` | The PKCE challenge derived from code_verifier |

| `code_challenge_method` Required | `S256` | Always SHA-256 |

| `app_id` Optional | `Your legacy app ID` | Your V1 app ID from the Legacy Deriv API — include this only if you also maintain a legacy API app |

#### OAuth Scopes

The scope parameter is a space-separated list of the permissions your app requests. Request only the scopes your app needs.

| Scope | Description |

| --- | --- |

| `trade` | Access to trading operations. |

| `account_manage` | Write access for account creation and management. |

| `application_read` | Read-only access to your registered applications. |

| `payment` | Access to payment agent deposit and withdrawal operations. |

#### Login URL

```bash

https://auth.deriv.com/oauth2/auth?

  response_type=code

  &client_id={YOUR_CLIENT_ID}          # e.g. app12345

  &redirect_uri={YOUR_REDIRECT_URI}    # e.g. https://yourapp.com/callback

  &scope=trade+account_manage

  &state={RANDOM_STATE}                # e.g. abc123random

  &code_challenge={PKCE_CHALLENGE}     # e.g. E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM

  &code_challenge_method=S256

```

##### Also maintaining a Legacy API app?

If you also have an app on the Legacy Deriv API, append `&app_id=YOUR_LEGACY_APP_ID` to the login URL (and sign up URL). Deriv will check whether the user belongs to the old or new platform and route them to the appropriate version of your app.

#### Login URL with legacy app support

```bash

https://auth.deriv.com/oauth2/auth?

  response_type=code

  &client_id={YOUR_CLIENT_ID}

  &redirect_uri={YOUR_REDIRECT_URI}

  &scope=trade+account_manage

  &state={RANDOM_STATE}

  &code_challenge={PKCE_CHALLENGE}

  &code_challenge_method=S256

  &app_id={YOUR_LEGACY_APP_ID}      # V1 app ID from legacy-api.deriv.com

```

### Sign Up

Sign up uses the same base URL and parameters as login, plus one additional required parameter:

#### Required sign up parameter

| Parameter | Value | Description |

| --- | --- | --- |

| `prompt` Required | `registration` | Always this exact value. Tells Deriv to show the signup form instead of login. |

#### Optional partner attribution parameters

The following parameters are all optional and managed in the Partners dashboard. Include them to attribute signups to your partner account. The tracking token parameter has four equivalent names (`t`, `affiliate_token`, `sidi`, `ca`) — use whichever one appears in your referral link or Partners dashboard.

| Parameter | Value | Purpose |

| --- | --- | --- |

| `t` `affiliate_token` `sidi` `ca` | Your affiliate tracking token | Tracking and attribution. Use **only one** of these parameter names — they are equivalent aliases. Pick the one that appears in your referral link or in the Partners dashboard. |

| `utm_campaign` | Your campaign name | Identifies the marketing campaign |

| `utm_medium` | affiliate | Indicates a partner integration |

| `utm_source` | Your affiliate ID | Commission tracking and reporting |

##### Which tracking parameter should I use?

`t`, `affiliate_token`, `sidi`, and `ca` all serve the same purpose. Use the one that appears in your Deriv referral link or in your Partners dashboard — don't include more than one.

#### Sign Up URL

```bash

https://auth.deriv.com/oauth2/auth?

  response_type=code

  &client_id={YOUR_CLIENT_ID}          # e.g. app12345

  &redirect_uri={YOUR_REDIRECT_URI}    # e.g. https://yourapp.com/callback

  &scope=trade+account_manage

  &state={RANDOM_STATE}                # e.g. abc123random

  &code_challenge={PKCE_CHALLENGE}     # e.g. E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM

  &code_challenge_method=S256

  &prompt=registration

  &t={YOUR_TRACKING_TOKEN}             # or: affiliate_token | sidi | ca — use the name from your referral link

  &utm_campaign={YOUR_CAMPAIGN}        # e.g. dynamicworks

  &utm_medium=affiliate

  &utm_source={YOUR_AFFILIATE_ID}      # e.g. CU303219

```

##### Important

Always validate the `state` parameter on return and generate your `code_challenge` from a secure random `code_verifier`. Never reuse these values between requests.

## Step 3: Handle the callback

Whether the user logged in or signed up, the callback works exactly the same way. After authentication, Deriv redirects to your `redirect_uri`:

```bash

https://yourapp.com/callback?code=AUTHORIZATION_CODE&state=RANDOM_STATE

```

If something went wrong:

```bash

https://yourapp.com/callback?error=access_denied&error_description=User+cancelled

```

### Your app must:

1. **Verify the state —** compare the `state` from the URL with the value you stored before the redirect. If they don't match, abort — it may be a CSRF attack.

2. **Extract the code —** read the `code` query parameter.

##### The authorization code is single-use and expires quickly

Exchange it immediately. Do not store or log authorization codes.

## Step 4: Exchange code for tokens

Make a POST request from your **backend** to the token endpoint. Never perform the token exchange from the browser.

```http

POST https://auth.deriv.com/oauth2/token

```

### Request body (form-encoded)

```bash

grant_type=authorization_code

client_id=YOUR_CLIENT_ID

code=AUTH_CODE_FROM_CALLBACK

code_verifier=YOUR_ORIGINAL_CODE_VERIFIER

redirect_uri=https://your-app.com/callback

```

### cURL example

```bash

curl -X POST https://auth.deriv.com/oauth2/token \

  -H "Content-Type: application/x-www-form-urlencoded" \

  -d "grant_type=authorization_code" \

  -d "client_id=YOUR_CLIENT_ID" \

  -d "code=AUTH_CODE" \

  -d "code_verifier=YOUR_CODE_VERIFIER" \

  -d "redirect_uri=https://your-app.com/callback"

```

### Token response

```json

{

  "access_token": "ory_at_...",

  "expires_in": 3600,

  "token_type": "Bearer"

}

```

## Step 5: Use the access token in API calls

Include the access token as a Bearer token in the `Authorization` header for all API calls:

```http

Authorization: Bearer YOUR_ACCESS_TOKEN

```

### Example

```bash

curl -X GET "https://api.derivws.com/trading/v1/options/accounts" \

  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

```

## Quick reference

| Endpoint | URL |

| --- | --- |

| Authorization | `https://auth.deriv.com/oauth2/auth` |

| Token exchange | `https://auth.deriv.com/oauth2/token` |

| API base URL | `https://api.derivws.com` |

Where to find your values:

| Value | Where |

| --- | --- |

| `client_id` | Register an OAuth2 app with Deriv — you'll receive an app ID |

| `redirect_uri` | Set during app registration — must match exactly |

| `t / affiliate_token / sidi / ca (signup)` | Your referral link or the Partners dashboard — use the exact parameter name shown there |

| `utm_source / affiliate ID (signup)` | Managed and set in the Partners dashboard |

| `utm_campaign (signup)` | Managed and set in the Partners dashboard |

| `app_id (legacy)` | Your V1 app ID from legacy-api.deriv.com — only needed if you maintain a Legacy API app |

## Troubleshooting

| Problem | Likely cause | Fix |

| --- | --- | --- |

| State mismatch error | state in the callback doesn't match stored value | Store state in sessionStorage before redirecting, and don't regenerate it on page load |

| invalid_grant on token exchange | code_verifier doesn't match the challenge, or code expired/already used | Send the original code_verifier, not a newly generated one; exchange the code immediately |

| Redirect URI mismatch | URL doesn't exactly match what's registered | Check for trailing slashes, http vs https, port numbers |

| invalid_client | Wrong client_id | Verify your credentials from the Deriv dashboard |

| Login form shows instead of signup | Missing prompt=registration | Add prompt=registration to the authorization URL |

| Signup not tracked to partner | Missing or wrong UTM parameters | Verify your tracking token parameter (one of t, affiliate_token, sidi, or ca) matches the one shown in your referral link, and that utm_source, utm_medium, and utm_campaign are all present and correct |

## Implementation checklist

### Login

- `response_type` is `code`

- `client_id` and `redirect_uri` are registered with Deriv

- `code_challenge` and `state` are generated fresh for each request

- `code_verifier` is stored in `sessionStorage` before redirect

- Callback verifies `state` before exchanging the code

- Token exchange happens server-side (not in the browser)

- `code_verifier` is cleared from storage after use

- If maintaining a legacy app, `app_id` is set to your Legacy app ID (optional)

### Sign Up (additional)

- `prompt` is set to `registration` (required)

- Tracking token (one of `t`, `affiliate_token`, `sidi`, `ca`) `utm_source`, `utm_campaign`, and `utm_medium` are set if needed — use the parameter name shown in your referral link or Partners dashboard (optional)”

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kocelscalpertool.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5ac4a90f-ee8d-468c-9818-4bbbaf119967).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
