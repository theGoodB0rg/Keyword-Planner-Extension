# Privacy & Data Handling

This extension processes the content of the active tab only when you explicitly trigger analysis or when a product page is detected.

What we collect/process:
- Page content needed to extract product attributes (title, bullets, specs, etc.)
- Derived data generated locally (keywords, optimization suggestions)
- Optional: Task timings (elapsedMs) strictly for local diagnostics

What we do NOT collect or send by default:
- Personally identifiable information (PII)
- Your browsing history beyond the active page content
- Any data to external servers without your action or explicit configuration

Storage:
- Results are stored locally using chrome.storage.local. A localStorage fallback is used if browser storage fails.
- You can clear data by removing the extension or using a future "Clear Data" action.

Network:
- In offline mode, all generation uses heuristics; no network calls.
- In online mode, AI calls would use the configured provider. Provider keys are never embedded in the extension; use a local proxy or secure backend for secrets.

Permissions rationale:
- activeTab: to read the current page content when invoked.
- storage: to persist your results locally for convenience.

If you have questions or requests, please open an issue in the repository.
