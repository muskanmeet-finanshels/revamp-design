#!/bin/bash
set -e
pnpm install --no-frozen-lockfile --prefer-offline
pnpm --filter db push
