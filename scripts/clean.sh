#!/usr/bin/env bash
set -euo pipefail

echo "Purging workspace artifacts..."

echo "Removing node_modules (this may take a while)..."
find . -name "node_modules" -type d -prune -exec rm -rf '{}' + || true

echo "Removing package build artifacts (dist, .next, .expo, .turbo)..."
find . -type d \( -name "dist" -o -name ".next" -o -name ".expo" -o -name ".turbo" \) -prune -exec rm -rf '{}' + || true

echo "Removing PNPM store links (node_modules/.pnpm) in workspace..."
find . -path "*/.pnpm" -type d -prune -exec rm -rf '{}' + || true

echo "Clean complete. You may want to run 'pnpm install' afterwards."
