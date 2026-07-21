# YeMind Zen v0.4.0 Verification

Verification commands:

```bash
npm test
npm run check
npm run build
node --check index.js
```

Acceptance areas:

- Custom RichText format whitelist includes `link`, `code` and `code-block`.
- Inline URL normalization rejects unsafe protocols.
- Code blocks can be inserted, updated, unformatted and deleted.
- Settings migrate from old data and validate invalid values.
- Rich-text toolbar callbacks preserve the engine selection through Quill's `lastRange`.
- Node badge display follows live settings.
- Production output contains the new source-built runtime.
