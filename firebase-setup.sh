#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PulseChat — Automated Firebase Setup
# Run this once in your terminal:  bash firebase-setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "  ${CYAN}ℹ${NC}  $*"; }
success() { echo -e "  ${GREEN}✔${NC}  $*"; }
warn()    { echo -e "  ${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "  ${RED}✖${NC}  $*" >&2; }
step()    { echo -e "\n${BOLD}▸ $*${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BLUE}${BOLD}  PulseChat — Firebase Setup${NC}"
echo ""

# ── Step 1: Firebase CLI ──────────────────────────────────────────────────────
step "Checking Firebase CLI"
if ! command -v firebase &>/dev/null && ! npx firebase --version &>/dev/null 2>&1; then
  info "Installing Firebase CLI..."
  npm install -g firebase-tools
fi
FIREBASE="npx firebase"
success "Firebase CLI ready: $($FIREBASE --version)"

# ── Step 2: Login ─────────────────────────────────────────────────────────────
step "Logging into Firebase"
info "Opening browser for Google login (beatmonstr2000@gmail.com)..."
echo ""
$FIREBASE login --reauth 2>/dev/null || $FIREBASE login
echo ""
success "Logged in"

# ── Step 3: Create project ────────────────────────────────────────────────────
step "Creating Firebase project"

# Generate a unique project ID
TIMESTAMP=$(date +%s | tail -c 6)
PROJECT_ID="pulsechat-${TIMESTAMP}"
PROJECT_NAME="PulseChat"

info "Project ID will be: ${PROJECT_ID}"
echo ""
read -r -p "  Use this ID or enter a custom one (press Enter to accept): " CUSTOM_ID
if [[ -n "$CUSTOM_ID" ]]; then
  PROJECT_ID="$CUSTOM_ID"
fi

$FIREBASE projects:create "$PROJECT_ID" --display-name "$PROJECT_NAME" --non-interactive 2>/dev/null \
  || { warn "Project may already exist, continuing..."; }

success "Project: $PROJECT_ID"

# ── Step 4: Set default project ───────────────────────────────────────────────
cat > .firebaserc << RCEOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  }
}
RCEOF
success ".firebaserc written"

# ── Step 5: Enable required APIs ─────────────────────────────────────────────
step "Enabling Firebase services"
info "This may take a minute..."

# Enable Firestore
$FIREBASE firestore:databases:create "(default)" \
  --location us-central1 \
  --project "$PROJECT_ID" 2>/dev/null \
  || warn "Firestore already enabled or use console to enable"

success "Firestore configured"

# ── Step 6: Create web app & get config ───────────────────────────────────────
step "Creating web app and fetching credentials"

info "Creating web app in Firebase project..."
APP_OUTPUT=$($FIREBASE apps:create web "PulseChat Web" --project "$PROJECT_ID" 2>&1)
echo "$APP_OUTPUT"

# Extract app ID
APP_ID=$(echo "$APP_OUTPUT" | grep -oE '[0-9]+:[0-9]+:web:[a-f0-9]+' | head -1)

if [[ -z "$APP_ID" ]]; then
  # Try to list existing apps
  APP_ID=$($FIREBASE apps:list web --project "$PROJECT_ID" 2>/dev/null | grep -oE '[0-9]+:[0-9]+:web:[a-f0-9]+' | head -1)
fi

if [[ -z "$APP_ID" ]]; then
  warn "Could not auto-detect App ID. Check Firebase Console for your web app ID."
  echo ""
  read -r -p "  Paste your App ID from console.firebase.google.com: " APP_ID
fi

success "App ID: $APP_ID"

# Fetch SDK config
info "Fetching SDK configuration..."
SDK_CONFIG=$($FIREBASE apps:sdkconfig web "$APP_ID" --project "$PROJECT_ID" 2>/dev/null)

# Parse values from SDK config
extract() {
  echo "$SDK_CONFIG" | grep -oP "\"$1\":\s*\"\K[^\"]*" | head -1
}

API_KEY=$(extract "apiKey")
AUTH_DOMAIN=$(extract "authDomain")
PROJ_ID=$(extract "projectId")
STORAGE_BUCKET=$(extract "storageBucket")
MESSAGING_SENDER_ID=$(extract "messagingSenderId")
APP_ID_VAL=$(extract "appId")
MEASUREMENT_ID=$(extract "measurementId")

# Fallback: use project ID to build values
[[ -z "$AUTH_DOMAIN" ]]       && AUTH_DOMAIN="${PROJECT_ID}.firebaseapp.com"
[[ -z "$PROJ_ID" ]]           && PROJ_ID="$PROJECT_ID"
[[ -z "$STORAGE_BUCKET" ]]    && STORAGE_BUCKET="${PROJECT_ID}.appspot.com"
[[ -z "$APP_ID_VAL" ]]        && APP_ID_VAL="$APP_ID"

# ── Step 7: Write .env ────────────────────────────────────────────────────────
step "Writing .env file"

cat > .env << ENVEOF
VITE_FIREBASE_API_KEY=${API_KEY}
VITE_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}
VITE_FIREBASE_PROJECT_ID=${PROJ_ID}
VITE_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}
VITE_FIREBASE_MESSAGING_SENDER_ID=${MESSAGING_SENDER_ID}
VITE_FIREBASE_APP_ID=${APP_ID_VAL}
VITE_FIREBASE_MEASUREMENT_ID=${MEASUREMENT_ID}
VITE_FIREBASE_VAPID_KEY=
ENVEOF

success ".env written with Firebase credentials"

echo ""
echo -e "  ${BOLD}Your Firebase Config:${NC}"
cat .env

# ── Step 8: Enable Auth providers in console ──────────────────────────────────
step "Enabling Authentication"
info "Enabling Email/Password auth..."
# Firebase Management REST API to enable auth providers
ACCESS_TOKEN=$($FIREBASE login:token 2>/dev/null || echo "")

if [[ -n "$ACCESS_TOKEN" ]]; then
  # Enable email/password provider
  curl -s -X PATCH \
    "https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "signIn": {
        "email": {"enabled": true, "passwordRequired": true},
        "anonymous": {"enabled": false}
      }
    }' > /dev/null 2>&1 && success "Email/Password auth enabled" \
    || warn "Enable Email/Password manually: console.firebase.google.com → Authentication → Sign-in method"
else
  warn "Enable these manually in Firebase Console → Authentication → Sign-in method:"
  echo "    • Email/Password"
  echo "    • Google"
fi

# ── Step 9: Deploy rules & indexes ────────────────────────────────────────────
step "Deploying Firestore rules and indexes"
$FIREBASE deploy --only firestore:rules,firestore:indexes --project "$PROJECT_ID" \
  && success "Firestore rules deployed" \
  || warn "Rules deploy failed — run: npx firebase deploy --only firestore:rules"

step "Deploying Storage rules"
$FIREBASE deploy --only storage --project "$PROJECT_ID" \
  && success "Storage rules deployed" \
  || warn "Storage rules deploy failed"

# ── Step 10: Generate VAPID key for FCM ───────────────────────────────────────
step "Firebase Cloud Messaging"
warn "For push notifications, get your VAPID key:"
echo "    Firebase Console → Project Settings → Cloud Messaging"
echo "    → Web Push certificates → Generate key pair"
echo "    → Add to .env as VITE_FIREBASE_VAPID_KEY="

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Firebase setup complete!               ║"
echo "  ║   Project: ${PROJECT_ID}"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  ${BOLD}Next steps:${NC}"
echo "  1. Enable Google Sign-In:  console.firebase.google.com → Authentication → Google"
echo "  2. Start the app:          ./start.sh"
echo ""
echo -e "  ${CYAN}Firebase Console:${NC} https://console.firebase.google.com/project/${PROJECT_ID}"
echo ""
