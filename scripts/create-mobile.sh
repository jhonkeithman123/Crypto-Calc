#!/usr/bin/env bash
set -euo pipefail

echo "Creating Expo app in apps/mobile using create-expo-app..."
npx create-expo-app apps/mobile --template expo-template-blank-typescript

echo "Expo app created at apps/mobile"
