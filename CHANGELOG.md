# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Security: Enforce signed activation tokens (ES256 JWS) with embedded public key; keep dev.* tokens for private beta only
- Monetization: Activation flow now verifies expiry and plan fields; clearer errors surfaced to UI
- Reliability: Added analyze debounce in background to prevent accidental double-runs and provider spam
- Dev proxy: Added local analysis endpoint (POST /analyze) with browser-friendly GET /analyze info page; exposed GET /proxy/ai info page to avoid "Cannot GET" confusion
- Dev wiring: Extension now prefers http://localhost:8787 in development with fast timeouts and graceful fallbacks to cloud providers and mock
- UI: Migrated popup and sidebar to React 18 createRoot; switched styled-components to transient props to eliminate unknown-prop warnings
- BYOK: Added "Disable BYOK" control in sidebar to bypass user keys and use OpenAI via local proxy; preference persisted in storage
- DX: Added @types/cors; clarified EXT_SHARED_SECRET usage in dev; improved error messages and GET / info endpoint for quick manual checks
- UI: Sidebar hero redesigned with progress meter, skeleton loading states, toast feedback, and inline preview meter/BYOK toggle; keyword table now includes per-row copy and competitor snapshots
- Testing: Added provider key resolution unit tests covering BYOK and environment-variable fallbacks
- CI: Build workflow now scans the dist bundle for Google/OpenAI key signatures to prevent leaking secrets

## [1.1.0] - 2025-09-19
- Harden Amazon scraper and unsupported page notice
- Task-level progress and status UI
- Platform-aware gap logic; unit tests
- CI releases on tags; privacy docs

## [1.0.0] - 2025-09-18
- Initial pivot to Product Listing Optimizer
- Optimization pipeline (long-tail, meta, bullets, gaps)
- Persistence + history viewer; export & copy
- CI build; README updates
