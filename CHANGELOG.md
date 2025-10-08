# Changelog

## 1.0.0 (2025-10-08)


### Features

* **janmandal:** add SVG mandala layout with framer-motion animations, glowing lines, rotating whispers, and affirmation ritual ([3b399ea](https://github.com/Zenslim/Gatishil/commit/3b399ea395ff5dc5601ef85e4e79069813d85234))
* **onboarding:** add entry + name/face steps with photo editing before roots ([4accce1](https://github.com/Zenslim/Gatishil/commit/4accce11d5de3cb184dc27dba2da7b5b55e0680d))
* **onboarding:** add entry and name steps to onboarding flow ([a1bca52](https://github.com/Zenslim/Gatishil/commit/a1bca52cbe6b148e79809618a14000f235c2edb7))
* **onboarding:** unify design with OnboardCardLayout and update Name/Roots/Welcome steps ([5573e2f](https://github.com/Zenslim/Gatishil/commit/5573e2f3f94605af51b3aa37312c594cbfe09c55))


### Bug Fixes

* **atmadisha:** auto-advance from intro to orbs if onDone not triggered ([a4c817d](https://github.com/Zenslim/Gatishil/commit/a4c817d1d3cd3ef9d39d43404e56ca54b8077c32))
* **atmadisha:** ensure IntroSky always triggers onDone even if images fail ([0a23d82](https://github.com/Zenslim/Gatishil/commit/0a23d82030576e6c053ddbca3ff5384bb3565464))
* **atmadisha:** guard Supabase usage at call site; fall back to bundled options when client missing ([8d621d9](https://github.com/Zenslim/Gatishil/commit/8d621d9a1c3adf35a78907f6c01ab66e51721ed3))
* **build:** add missing Next.js and core dependencies for Vercel build ([f413ce5](https://github.com/Zenslim/Gatishil/commit/f413ce53454ebfc43a3c6ce741acbc7cbc0909b5))
* **build:** add missing Tailwind, lucide-react, WebAuthn, and markdown deps ([b26e8cc](https://github.com/Zenslim/Gatishil/commit/b26e8cc4637d70a7e1ede0162b2d084880c75835))
* **ci:** pin [@typescript-eslint](https://github.com/typescript-eslint) to 8.46.0 and use npm ci ([367b004](https://github.com/Zenslim/Gatishil/commit/367b0046bcbebf192e5961e0c828008804ee34dc))
* **core:** export both default and named supabase client; provide safe stub for preview/SSR ([cf4e8d3](https://github.com/Zenslim/Gatishil/commit/cf4e8d39c32e93ef272a42c6c294c06366ee6bb3))
* **core:** make supabase client safe by default (stub .from to prevent runtime crashes) ([6b42063](https://github.com/Zenslim/Gatishil/commit/6b42063384e21a52d7a937b36181ee7c8de526db))
* **introsky:** remove portal overlay so orbs and questions become visible ([3ad72cc](https://github.com/Zenslim/Gatishil/commit/3ad72cc26553b5ada0dee5c4db434fbb6349b315))
* **janmandal:** declare missing activePanel state to resolve ReferenceError ([135a109](https://github.com/Zenslim/Gatishil/commit/135a1091b544b37ce7ae7a8874b5bfd7ebf0a977))
* **janmandal:** remove duplicate JanmandalStep export to resolve build error ([1e82ca1](https://github.com/Zenslim/Gatishil/commit/1e82ca199316b3f28b7ecccc0abc728d51f77eb8))
* **join:** remove SITE_URL bounce to allow preview-domain OTP ([7cdb9b2](https://github.com/Zenslim/Gatishil/commit/7cdb9b2c498a959e5226051f1adda48e7988ffcf))
* **join:** remove SITE_URL redirect bounce ([928e314](https://github.com/Zenslim/Gatishil/commit/928e3148ba6ef495aedfff59f58ea7f16ee8387c))
* **onboarding:** finalize NameFaceStep to upload and persist Supabase photo_url ([593016c](https://github.com/Zenslim/Gatishil/commit/593016cf3a6b2e8686ecaf8563476029d878a2f4))
* **onboarding:** pass required onBack to all steps and align props (t, onNext, onBack) ([e8f50cf](https://github.com/Zenslim/Gatishil/commit/e8f50cf095146723b13d16efd42eaba8fab4eaa2))
* **onboarding:** pass t prop to NameFaceStep ([6707f10](https://github.com/Zenslim/Gatishil/commit/6707f10f8abd1df23b0a34bdb3d187062be7fa99))
* **onboarding:** pass t to WelcomeStep and make it self-contained ([4d148d2](https://github.com/Zenslim/Gatishil/commit/4d148d208a1f54af595340babbadd7f80d90a043))
* **onboarding:** pass t to WelcomeStep and make it self-contained ([4d148d2](https://github.com/Zenslim/Gatishil/commit/4d148d208a1f54af595340babbadd7f80d90a043))
* **onboarding:** persist public photo_url and resolve 400 upload errors ([d9a2165](https://github.com/Zenslim/Gatishil/commit/d9a21653101fb703f5a53a08acdff6683b89f010))
* **onboarding:** remove session check and supabase dependency from NameFaceStep ([c55b835](https://github.com/Zenslim/Gatishil/commit/c55b835626e78a809afae5179b524dbb304ed138))
* **onboarding:** satisfy RootsStep required supabase prop (TS) ([db51b6c](https://github.com/Zenslim/Gatishil/commit/db51b6c93194c9e68a4d64e3d6f61e8e21eb58fd))
* **onboarding:** simplify flow to Roots → Janmandal only ([49939e5](https://github.com/Zenslim/Gatishil/commit/49939e54f4ef3b95d3f93bd5ae46ec56034b5803))
* otp redirect to current origin ([2901c3c](https://github.com/Zenslim/Gatishil/commit/2901c3c7c87a4ee4d879d5f00b27628d594add8d))
* separate Roots and Janmandal ([97b736a](https://github.com/Zenslim/Gatishil/commit/97b736a5fa5e8dc69ef0ddb8cd3ea191a1ecd8fd))
* **supabase:** correct RLS policy creation using policyname instead of polname ([aeaf0d8](https://github.com/Zenslim/Gatishil/commit/aeaf0d854e1174b3ad245edbe75a8660bab6cb9f))
* **why:** replace file with valid client component (no next/head, no diff markers) ([10b6a5b](https://github.com/Zenslim/Gatishil/commit/10b6a5b265607b532c90717032949af79fa9a103))
