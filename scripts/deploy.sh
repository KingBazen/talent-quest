#!/usr/bin/env bash
# scripts/deploy.sh — push current branch to GitHub, which triggers Vercel.
#
# Vercel is connected to the KingBazen/talent-quest GitHub repo, so any push
# to `main` automatically builds + deploys https://talent-quest.vercel.app/.
# This script just wraps the add/commit/push dance into one command.
#
# Usage:
#   npm run deploy                    # uses default commit message
#   npm run deploy -- "fix: nav bug"  # custom commit message
#
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
MSG="${1:-deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "→ staging changes"
  git add -A
  echo "→ committing: $MSG"
  git commit -m "$MSG"
else
  echo "→ no local changes; pushing existing commits only"
fi

echo "→ pushing to origin/$BRANCH"
git push origin "$BRANCH"

echo
echo "Vercel will now build and deploy."
echo "Watch:  https://vercel.com/dashboard"
echo "Live:   https://talent-quest.vercel.app/"
