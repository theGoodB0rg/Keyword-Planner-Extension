# Provider Configuration & Secure Proxy

This extension should not embed provider API keys. To use online AI providers safely, set up a minimal proxy:

- A tiny server (e.g., Cloudflare Worker, Vercel Serverless, or your own backend)
- Validates requests from the extension (e.g., origin allowlist, simple token)
- Holds provider API keys securely and forwards requests to providers
- Returns only the needed content back to the extension

Example minimal proxy contract (POST /ai):
- Request JSON: { model: string, messages: [...], max_tokens?: number }
- Response JSON: { content: string }

Security tips:
- Never log full prompts with sensitive data in production
- Rate-limit requests
- Consider per-user tokens and quotas
- Add CORS properly for the extension origin(s)

In this repo, see `src/utils/api.ts` for where calls would be routed. Replace placeholder URLs/keys, or switch to your proxy endpoint.
