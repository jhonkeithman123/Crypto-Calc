#!/usr/bin/env bash
set -euo pipefail

echo "Creating Next.js app in apps/web using create-next-app..."
npx create-next-app@latest apps/web --typescript

echo "Next.js app created at apps/web"
