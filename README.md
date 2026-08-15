# Signal Sigma mobile

Personal iOS desk for [Signal Sigma](https://github.com/fcpauldiaz/signal-sigma). Same Overview, Positions, Orders, and Performance views as the web desk, plus paper/live, unlock, and trading actions.

Talks to the deployed desk API at `https://signal-sigma.chapilabs.com` by default.

## Setup

```bash
pnpm install
pnpm start
```

Override the API URL with `EXPO_PUBLIC_API_URL` in `.env` for a local or staging server.

## Production build

EAS project `@fcpauldiaz/signal-sigma`, bundle id `com.chapilabs.signalsigma`. Production IPAs go to TestFlight via Apple Transporter.

```bash
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --platform ios --profile production
```
