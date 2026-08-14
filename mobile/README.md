# Real Estate MVP — Mobile (Flutter, Riverpod, Feature-First)

## Structure

```
mobile/
├── lib/
│   ├── core/
│   │   ├── network/
│   │   │   ├── supabase_client.dart   # Auth ONLY — see note below
│   │   │   └── api_client.dart        # Talks to the custom backend, attaches JWT
│   │   ├── theme/app_theme.dart
│   │   ├── constants/env.dart          # --dart-define config
│   │   └── error/                      # Shared AppFailure + Dio error mapping
│   ├── features/
│   │   ├── auth/          # domain / data / presentation
│   │   ├── property/      # domain / data / presentation
│   │   └── viewing/       # domain / data / presentation
│   ├── app.dart            # Root widget, auth-gated routing
│   └── main.dart
├── analysis_options.yaml
└── pubspec.yaml
```

## Important architectural note: two different backends, on purpose

The mobile app talks to **two different servers**, matching the spec:

- **Supabase directly** — for Auth only (`core/network/supabase_client.dart`). Sign-up/sign-in/session management goes straight to Supabase, same as the architecture doc specifies ("Client apps authenticate via Supabase Auth").
- **The custom backend** (`core/network/api_client.dart`) — for every property/viewing operation. Every outgoing request auto-attaches `Authorization: Bearer <supabase-jwt>`, which the backend's middleware independently re-verifies against Supabase's JWKS. The mobile app never talks to Supabase's own REST API for property/viewing data — it always goes through the custom backend, so business rules (ownership checks, publish rules, ACID booking) are enforced in one place.

## Running it

```bash
cd mobile
flutter pub get
flutter run \
  --dart-define=SUPABASE_URL=https://<project-ref>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon-key> \
  --dart-define=API_BASE_URL=http://10.0.2.2:8080/api/v1
```

`API_BASE_URL` defaults to `10.0.2.2` (Android emulator's alias for the host machine's `localhost`). For iOS simulator, use `http://localhost:8080/api/v1` instead. For a physical device, use your machine's LAN IP.

## ⚠️ Not yet compiler-verified

Unlike the backend (which was `tsc --noEmit`'d) and the SQL migration (which was run against a real local Postgres+PostGIS instance), **this Flutter code has not been run through `flutter analyze` or `flutter pub get`** — there's no Flutter/Dart SDK available in the environment this was generated in, and it isn't on the small allow-list of package registries reachable here (npm/pip/cargo only).

The code was written carefully against Dart 3 syntax (sealed classes, pattern-matching `switch` expressions) and each file was manually reviewed for consistency, but it hasn't been compiled. Please run:

```bash
flutter pub get
flutter analyze
```

as your first step, and paste back any errors — same troubleshooting loop we used for the backend.

## Auth flow implemented

Email OTP (per architecture spec) — `LoginScreen` sends a one-time code to the user's email via `AuthRepository.sendOtp()`, then verifies it via `verifyOtp()`. `signInWithPassword()` is also implemented on the repository in case you want a password-based flow for agent/admin accounts later, just not wired into the UI yet.

## What's implemented vs. stubbed

**Implemented:** auth (OTP), property search (radius-based, matches the live `/properties/search` endpoint), property detail, create-draft + publish flow (repository/provider level — no "create listing" form screen yet), book-a-viewing flow with the 409 slot-conflict surfaced as a distinct, user-friendly message (not a generic error).

**Not yet built:** image upload to Supabase Storage, a "create/edit listing" form screen for agents, "my listings" / "my bookings" screens (providers exist — `myPropertiesProvider`, `myViewingsProvider` — just no screen consuming them yet), device geolocation (search currently defaults to a fixed demo coordinate).
