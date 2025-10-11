## UI / UX Modernization Plan

### Objectives
- Fast clarity: user sees value ≤ 5s after clicking Analyze
- Progressive reveal: skeleton loaders → partial results stream
- Consistent information hierarchy: Product → Gaps → Suggestions → Export
- Accessible (keyboard + ARIA) & responsive (≥ 320px width)
- Dark mode and high-contrast ready via CSS variables

### Surfaces
1. Popup (Control Center)
   - Actions: Analyze, Offline toggle, Settings, Recent history
   - Status badges: AI / Offline / Cache Hit / Usage Counter
2. Side Panel (Injected)
   - Docked overlay (right edge, resizable, draggable collapse)
   - Sections as collapsible accordions
3. Toast Layer
   - Ephemeral notifications (copy success, error fallback)

### Component Layout (Panel)
```
Header: [Title] [StatusBadges] [Close]
Tabs or Accordions:
  - Product Attributes (title, price, brand, variants)
  - Gaps (missing attributes w/ severity badges)
  - Long-tail Modifiers (chips w/ copy buttons)
  - Bullets (original vs rewritten diff toggles)
  - Meta Suggestions (title + description w/ char counters)
  - Export (format options + preview)
Footer: Usage Meter | Privacy Toggle | Version
```

### Visual Language
- Color tokens:
  - `--c-bg`, `--c-bg-alt`, `--c-surface`, `--c-border`, `--c-text`, `--c-text-dim`, `--c-accent`, `--c-warn`, `--c-error`, `--c-success`
- Light / dark theme maps; prefer HSL for easy theming.
- Elevation: subtle shadow for panel, no heavy drop shadows.

### States & Feedback
| State | Pattern |
|-------|---------|
| Loading | Skeleton rows + animated shimmer |
| Partial | Section-level spinners replaced individually |
| Empty | Neutral illustration + single CTA |
| Error (task) | Inline alert bar (retry link) |
| Offline | Banner: "Offline heuristic mode" w/ info tooltip |
| Quota nearing | Usage meter turns amber at 80% |

### Accessibility
- All interactive elements: `role` + `aria-label`
- Focus ring visible (outline offset) + skip link at panel top
- Keyboard shortcuts: `Ctrl+Shift+O` open panel, `Esc` close
- Prefers Reduced Motion: disable shimmer animation

### Performance Considerations
- Lazy mount non-visible sections
- Use CSS containment where possible (`contain: layout paint size style`)
- Minify React bundle + consider Preact alias if size pressure arises

### Interaction Flows
Flow: First Analyze
1. User opens product page
2. Opens popup → clicks Analyze
3. Panel injects + shows skeleton
4. Product Attributes fill (from scraper synchronous)
5. AI tasks stream: Long-tail → Bullets → Meta → Gaps
6. Export becomes enabled when ≥ 2 suggestion sections ready

Flow: Copy Keyword / Bullet
- Hover reveals copy icon → click → toast “Copied” (1.5s)

Flow: Toggle Offline Mode
- Toggle immediately disables pending AI tasks and triggers heuristic regeneration

### Diff View (Bullets)
- Side-by-side or inline toggle.
- Highlight additions (green), deletions (red strikethrough), modifications (yellow background).

### Usage Meter
- Horizontal bar (0–N tasks left) with tooltip “Daily analyses reset in 14h 32m”.

### Export Dialog
- Options: Copy All, JSON, CSV
- Preview area (collapsible)

### Dark Mode Strategy
- Detect `prefers-color-scheme`
- Provide manual override in settings
- Maintain semantic tokens; no hardcoded hex in components

### Error Copy Examples
- Scrape failure: “Couldn’t recognize this as a product page. Try another or refine selectors.”
- AI fallback: “Provider timeout—showing heuristic results (accuracy reduced).”

### Future Enhancements
- Inline editing & re-run rewrite tasks
- Drag reordering for bullet priority
- Live variant combinator preview

---
This plan guides the UI refactor; update as components are implemented.

## 2025-09-20 Snapshot
- Sidebar now opens with a hero banner, clear CTA copy, and toast notifications for copy/export actions.
- Keyword table uses skeleton shimmers while data loads and exposes per-row copy plus competitor snapshot controls.
- Progress board surfaced for AI tasks with color-coded states (queued, running, done, error).
- Preview meter and BYOK toggles are inline, matching the monetization preview allowance described elsewhere.
