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

## Bring Your Own Key (BYOK)

The extension now exposes a BYOK drawer in the sidebar. Keys are stored locally in `chrome.storage` (namespaced) and never bundled into the dist build. When a key is present:
- Gemini keys (`provider: gemini`) are appended to requests directly (Google Generative Language API).
- OpenAI-compatible keys (`provider: openai`) are injected into the `Authorization` header for OpenAI and generic OpenAI clones.
- Preview gating is bypassed so users can run unlimited AI requests without exhausting the built-in allowance.

## Build-time environment variables

For automated tests or local development you can set environment variables before running `npm run build` or `npm run dev`:

```bash
export GEMINI_API_KEY=...
export OPENAI_API_KEY=...
export OTHER_FALLBACK_AI_KEY=... # optional
```

If these variables are not set the extension will fall back to placeholders and skip the corresponding provider attempt. Do not check real keys into the repo; they would be embedded into the webpack bundle.

## CI guardrail

The GitHub Actions workflow includes a post-build scan (`grep -R "AIza" dist` and `grep -R "sk-" dist`) to fail the pipeline if a Google or OpenAI style key string sneaks into the artifacts. Adjust the patterns if you add additional providers.
