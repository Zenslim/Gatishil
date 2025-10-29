# i18n Overrides Flow

Manual Nepali translations live in the `public.i18n_overrides` table and always take precedence over
machine generated strings. The runtime now keeps the two sources separate so translators can be sure
that human-reviewed text is never replaced by the automatic fallback.

## Client runtime
- `I18nProvider` preloads both the machine cache (`i18n_cache`) and the approved overrides when the
  app boots in the browser.
- Overrides are stored in their own state map and are checked before the dynamic machine cache when
  resolving `t(key)`.
- Automatic translations fetched at runtime are only written into the cache if no override exists for
  the key. If an override is added later it wins immediately because the provider re-checks the
  overrides state before reading the cache.

## `/api/i18n/auto`
- The API now short-circuits if an override exists, returning the human translation immediately.
- Machine translations are cached only when the key has no override, preventing accidental
  overwrites of human-edited copy.

The practical effect is that translators can confidently update `i18n_overrides`: the application
will always favor their edits, while machine translations remain a fallback when no override has been
approved yet.
