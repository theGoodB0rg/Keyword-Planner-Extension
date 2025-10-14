# token-proxy-service

Minimal token issuance + AI proxy for the Chrome extension.

## Features
- POST /issue-token – sign ES256 JWS tokens (payload includes plan, dailyAllowance, features, expiresAt)
- GET /.well-known/jwks.json – expose public JWK for client verification
- POST /proxy/ai – forward to OpenAI chat completions or echo if no key
- POST /proxy/trends – normalize Google Trends interest-over-time data with caching + rate limiting
- GET /health – health check
- Shared-secret header `X-EXT-SECRET` to gate access (set EXT_SHARED_SECRET)

## Env
Copy `.env.example` to `.env` and adjust.

- PORT: default 8787
- EXT_SHARED_SECRET: required for prod; leave blank to disable auth in dev
- PRIVATE_JWK / PUBLIC_JWK: optional JWK JSON strings; otherwise an ephemeral keypair is generated
- OPENAI_API_KEY: optional; if missing, proxy runs in echo mode
- TRENDS_RATE_LIMIT: optional cap on `/proxy/trends` requests per client within the window (defaults to 60)
- TRENDS_RATE_WINDOW_MS: optional window duration in ms for the rate limit (defaults to 60000)

## Run
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm start`
- Test: `npm test`

## Examples
- Issue token (expires in 7 days):
  POST /issue-token
  { "plan": "pro", "dailyAllowance": 200, "features": {"csvExport": true}, "expiresAt": 1732147200000 }

- JWKS for client:
  GET /.well-known/jwks.json

- Proxy AI in echo mode:
  POST /proxy/ai
  { "model": "gpt-4o-mini", "prompt": "Hello" }
