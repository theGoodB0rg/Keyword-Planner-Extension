# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Security: Enforce signed activation tokens (ES256 JWS) with embedded public key; keep dev.* tokens for private beta only
- Monetization: Activation flow now verifies expiry and plan fields; clearer errors surfaced to UI
- Reliability: Added analyze debounce in background to prevent accidental double-runs and provider spam

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
