## Documentation Plan

### Purpose
Ensure maintainability, contributor clarity, and user trust during the pivot from generic keyword planner to Product Listing Optimizer.

### Core Documents
| File | Audience | Purpose | Status |
|------|----------|---------|--------|
| README.md | Users / Devs | High-level value, quickstart, feature matrix | Updated (pivot draft) |
| ARCHITECTURE.md | Devs | Module boundaries & flows | Added |
| PRODUCT_SCRAPER_SPEC.md | Devs | Deterministic scraping rules | Added |
| AI_TASKS_SPEC.md | Devs | AI task contracts + prompts | Added |
| SECURITY.md | Users / Reviewers | Permissions, secret handling | Added |
| UI_UX_PLAN.md | Devs / Design | Interaction + component structure | Added |
| TELEMETRY_SPEC.md | Devs / Legal | Event schema + privacy stance | Added |
| DOCS_PLAN.md | Internal | Meta index | Added |
| ROADMAP.md | Users / Stakeholders | Phase cadence & feature sequencing | Pending |
| CONFIGURATION.md | Users | Env vars, provider setup, build flags | Pending |
| PROMPTS.md | Devs | Finalized task prompt templates (frozen versions) | Pending |
| CONTRIBUTING.md | External contributors | How to run, branch naming, style, tests | Pending |
| CHANGELOG.md | Users | Versioned change history | Pending |

### Upcoming Draft Priorities
1. CONFIGURATION.md (unblocks safe key handling)
2. ROADMAP.md (communicates trajectory)
3. CONTRIBUTING.md (once initial refactor stable)
4. CHANGELOG.md (start at v0.8.0 pivot pre-release)

### Style Guidelines
- Use present tense for current features; “Planned” section for future
- Keep each spec self-contained (no cross-file dependency for understanding)
- Use tables for matrices (permissions, feature status)
- Provide update timestamp at top for evolving docs (optional)

### Automation Ideas
- GitHub Action to validate docs exist before release tag
- Spell check / lint documentation (optional)

### Maintenance Cadence
- Major architecture changes → update ARCHITECTURE.md within same PR
- New AI task → update AI_TASKS_SPEC.md & PROMPTS.md (when extracted)
- New permission → update SECURITY.md & README manifest snippet

---
Revisit this plan after Phase 1 implementation to prune or expand.
