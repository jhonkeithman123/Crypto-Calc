# Patch Notes - v1.2.0

Date: 2026-04-07

## Mobile: Stability and Core Fixes

- Fixed multiple React Native mobile issues across error handling, logic, and UI behavior.
- Hardened runtime validation and error display in the cipher flow.
- Fixed custom base/modulus mismatch in cipher calculations.
- Fixed history restore behavior in modular calculator to restore correct expression/result state.
- Improved local storage parsing safety for calculator history.

## Mobile: Navigation and Layout

- Fixed bottom tab overlap on some devices by using safe-area-aware tab sizing.
- Added and validated a new Base Converter tab with step-by-step conversion breakdown:
  - Source base to decimal steps
  - Decimal to binary/octal/hex/custom steps

## Mobile: About and Updates Experience

- Added About/Info panel in mobile with app metadata, creator info, and links.
- Added GitHub-based update checker in mobile About screen (mobile-only).

## Visual System (Mobile + Shared)

- Added animated galaxy-style floating background effects.
- Added scroll parallax depth effects.
- Extracted galaxy visuals into reusable components.
- Created shared workspace package: `@crypto/galaxy-elements`.
- Increased transparency on key panels so floating effects are visible.

## Web: Feature Parity Additions

- Added `/convert` and `/about` pages.
- Added galaxy visual background support using shared package data.
- Kept update checker mobile-only by removing live web update checks.

## Tooling and Build System

- Resolved TypeScript module resolution deprecation warnings.
- Added missing Turbo task config for mobile start flow.
- Updated workspace dependency/linking setup and revalidated package resolution.
- Re-ran monorepo TypeScript checks after each major change.

## Android Build Status

- Local Android release APK build succeeded:
  - `./gradlew assembleRelease`
