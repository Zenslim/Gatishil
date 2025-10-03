# Onboarding UI Refactor — Unified Dark Card + DAO Yellow

**What this does**
- Introduces `OnboardCardLayout.jsx` for a consistent black background and glowing card wrapper.
- Updates `WelcomeStep.jsx`, `NameFaceStep.jsx`, `RootsStep.jsx` to use the shared layout.
- Unifies buttons to **DAO Yellow** across steps.
- Keeps business logic intact (avatar upload, Supabase writes).

**Changed files**
- components/onboard/OnboardCardLayout.jsx
- components/onboard/WelcomeStep.jsx
- components/onboard/NameFaceStep.jsx
- components/onboard/RootsStep.jsx
- components/OnboardingFlow.tsx (returns steps directly; each step includes layout)

**Test (ELI15)**
1. `/join` → verify black background & card.
2. `/onboard?step=entry` → Welcome card matches Join theme; click **Begin my circle**.
3. Name & Face → take/choose photo, crop → **Continue** becomes enabled → go next.
4. Roots → pick Nepal path or Abroad → **Continue** saves; moves next.
5. Janmandal stub → finish to `/dashboard`.

**Regression to test**
- Avatar uploads to `avatars` bucket.
- `profiles` upsert works for name/surname/photo_url.
- `profiles.roots_json` updates correctly.

**Note**: If your project’s `NameFaceStep.jsx` or `RootsStep.jsx` diverged heavily, keep your logic but wrap output with `<OnboardCardLayout>...</OnboardCardLayout>` and switch button classes to the provided yellow styles.
