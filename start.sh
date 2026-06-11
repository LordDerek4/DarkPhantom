#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PulseChat — Development Startup Script
# Usage:  ./start.sh [--emulators] [--setup] [--build] [--help]
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

# ── Flags ─────────────────────────────────────────────────────────────────────
USE_EMULATORS=false
RUN_SETUP=false
RUN_BUILD=false

for arg in "$@"; do
  case $arg in
    --emulators) USE_EMULATORS=true ;;
    --setup)     RUN_SETUP=true ;;
    --build)     RUN_BUILD=true ;;
    --help|-h)
      echo -e "${BOLD}PulseChat start.sh${NC}"
      echo ""
      echo "  ./start.sh               Start dev server"
      echo "  ./start.sh --emulators   Start with Firebase emulators"
      echo "  ./start.sh --setup       Run Firebase setup wizard first"
      echo "  ./start.sh --build       Production build then preview"
      echo "  ./start.sh --help        Show this help"
      exit 0
      ;;
  esac
done

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}${BOLD}"
echo "  ██████╗ ██╗   ██╗██╗     ███████╗███████╗ ██████╗██╗  ██╗ █████╗ ████████╗"
echo "  ██╔══██╗██║   ██║██║     ██╔════╝██╔════╝██╔════╝██║  ██║██╔══██╗╚══██╔══╝"
echo "  ██████╔╝██║   ██║██║     ███████╗█████╗  ██║     ███████║███████║   ██║   "
echo "  ██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  ██║     ██╔══██║██╔══██║   ██║   "
echo "  ██║     ╚██████╔╝███████╗███████║███████╗╚██████╗██║  ██║██║  ██║   ██║   "
echo "  ╚═╝      ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   "
echo -e "${NC}"
echo -e "  ${CYAN}Discord-inspired community platform${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Helper functions ───────────────────────────────────────────────────────────
info()    { echo -e "  ${CYAN}ℹ${NC}  $*"; }
success() { echo -e "  ${GREEN}✔${NC}  $*"; }
warn()    { echo -e "  ${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "  ${RED}✖${NC}  $*" >&2; }
step()    { echo -e "\n${BOLD}▸ $*${NC}"; }

# ── 1. Check prerequisites ────────────────────────────────────────────────────
step "Checking prerequisites"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    success "$1 found: $(command -v "$1")"
    return 0
  else
    error "$1 not found"
    return 1
  fi
}

MISSING=0
check_cmd node  || MISSING=$((MISSING+1))
check_cmd npm   || MISSING=$((MISSING+1))

if [[ $MISSING -gt 0 ]]; then
  error "Please install the missing tools above, then re-run this script."
  echo ""
  echo "  Install Node.js: https://nodejs.org  (v18+ recommended)"
  exit 1
fi

# Node version check
NODE_VERSION=$(node -e "process.stdout.write(process.version.replace('v',''))")
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [[ $NODE_MAJOR -lt 18 ]]; then
  warn "Node.js v$NODE_VERSION detected — v18+ recommended for Vite 5"
else
  success "Node.js v$NODE_VERSION"
fi

# Firebase CLI check (optional)
if command -v firebase &>/dev/null; then
  success "Firebase CLI: $(firebase --version 2>/dev/null | head -1)"
  HAS_FIREBASE_CLI=true
else
  warn "Firebase CLI not installed (optional — needed for emulators/deploy)"
  info "Install: npm install -g firebase-tools"
  HAS_FIREBASE_CLI=false
fi

# ── 2. Install dependencies ────────────────────────────────────────────────────
step "Installing dependencies"

if [[ ! -d "node_modules" ]]; then
  info "node_modules not found — running npm install..."
  npm install
  success "Dependencies installed"
elif [[ package.json -nt node_modules/.package-lock.json ]] 2>/dev/null; then
  info "package.json changed — running npm install..."
  npm install
  success "Dependencies updated"
else
  success "Dependencies up to date"
fi

# ── 3. Environment check ────────────────────────────────────────────────────────
step "Checking environment configuration"

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  warn ".env file not found"
  if [[ -f "$ENV_EXAMPLE" ]]; then
    echo ""
    echo -e "  ${YELLOW}Creating .env from .env.example...${NC}"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo ""
    echo -e "  ${BOLD}⚙  Firebase credentials required:${NC}"
    echo ""
    echo "     1. Go to https://console.firebase.google.com"
    echo "     2. Select your project → Project Settings → Your apps"
    echo "     3. Copy the firebaseConfig values into .env"
    echo ""
    echo "  Required keys:"
    grep "^VITE_" "$ENV_EXAMPLE" | while IFS= read -r line; do
      echo -e "    ${CYAN}${line%%=*}${NC}"
    done
    echo ""

    if [[ "$RUN_SETUP" == false ]]; then
      read -r -p "  Press Enter to continue anyway, or Ctrl+C to fill .env first: "
    fi
  else
    error "No .env or .env.example found. Cannot continue."
    exit 1
  fi
else
  # Validate that required keys are set
  MISSING_KEYS=0
  while IFS= read -r line; do
    KEY="${line%%=*}"
    [[ -z "$KEY" || "$KEY" == \#* ]] && continue
    VAL=$(grep -E "^${KEY}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' | tr -d "'")
    if [[ -z "$VAL" || "$VAL" == *"your_"* || "$VAL" == *"_here"* ]]; then
      warn "Missing or placeholder: ${KEY}"
      MISSING_KEYS=$((MISSING_KEYS+1))
    fi
  done < "$ENV_EXAMPLE"

  if [[ $MISSING_KEYS -eq 0 ]]; then
    success ".env looks good ($( grep -c "^VITE_" "$ENV_FILE" ) keys set)"
  else
    warn "$MISSING_KEYS Firebase key(s) are still placeholders in .env"
    info "Edit .env and fill in your Firebase credentials before deploying"
  fi
fi

# ── 4. Firebase setup wizard ────────────────────────────────────────────────────
if [[ "$RUN_SETUP" == true ]]; then
  step "Firebase Setup Wizard"

  if [[ "$HAS_FIREBASE_CLI" == false ]]; then
    info "Installing Firebase CLI globally..."
    npm install -g firebase-tools
    HAS_FIREBASE_CLI=true
  fi

  echo ""
  echo -e "  ${BOLD}This will guide you through Firebase project setup.${NC}"
  echo ""

  info "Logging into Firebase / Google..."
  firebase login --no-localhost 2>/dev/null || firebase login

  echo ""
  info "Listing your Firebase projects:"
  firebase projects:list 2>/dev/null || true

  echo ""
  read -r -p "  Enter your Firebase Project ID (from the list above): " FB_PROJECT_ID

  if [[ -n "$FB_PROJECT_ID" ]]; then
    # Write .firebaserc
    cat > .firebaserc << FBRC
{
  "projects": {
    "default": "${FB_PROJECT_ID}"
  }
}
FBRC
    success ".firebaserc written with project: $FB_PROJECT_ID"

    # Update .env with project ID
    if [[ -f "$ENV_FILE" ]]; then
      sed -i.bak "s|VITE_FIREBASE_PROJECT_ID=.*|VITE_FIREBASE_PROJECT_ID=${FB_PROJECT_ID}|" "$ENV_FILE"
      sed -i.bak "s|VITE_FIREBASE_AUTH_DOMAIN=.*|VITE_FIREBASE_AUTH_DOMAIN=${FB_PROJECT_ID}.firebaseapp.com|" "$ENV_FILE"
      sed -i.bak "s|VITE_FIREBASE_STORAGE_BUCKET=.*|VITE_FIREBASE_STORAGE_BUCKET=${FB_PROJECT_ID}.appspot.com|" "$ENV_FILE"
      rm -f "${ENV_FILE}.bak"
      success "Updated .env with project ID"
    fi

    echo ""
    info "Deploying Firestore rules and indexes..."
    firebase deploy --only firestore:rules,firestore:indexes --project "$FB_PROJECT_ID" && \
      success "Firestore rules deployed" || warn "Rules deploy failed — check errors above"

    echo ""
    info "Deploying Storage rules..."
    firebase deploy --only storage --project "$FB_PROJECT_ID" && \
      success "Storage rules deployed" || warn "Storage rules deploy failed"
  fi
fi

# ── 5. Firebase Emulators ────────────────────────────────────────────────────────
if [[ "$USE_EMULATORS" == true ]]; then
  step "Starting Firebase Emulators"

  if [[ "$HAS_FIREBASE_CLI" == false ]]; then
    error "Firebase CLI required for emulators. Install: npm install -g firebase-tools"
    exit 1
  fi

  # Ensure emulator config exists
  if [[ ! -f "firebase.json" ]]; then
    error "firebase.json not found. Run: firebase init emulators"
    exit 1
  fi

  # Add emulator config to .env
  grep -q "VITE_USE_EMULATORS" "$ENV_FILE" 2>/dev/null \
    || echo "VITE_USE_EMULATORS=true" >> "$ENV_FILE"
  sed -i.bak 's/VITE_USE_EMULATORS=.*/VITE_USE_EMULATORS=true/' "$ENV_FILE"
  rm -f "${ENV_FILE}.bak"

  info "Starting Firebase emulators in background..."
  firebase emulators:start \
    --only auth,firestore,storage \
    --import=./emulator-data \
    --export-on-exit=./emulator-data &
  EMULATOR_PID=$!
  echo "$EMULATOR_PID" > .emulator.pid

  # Wait for emulators to be ready
  info "Waiting for emulators..."
  for i in {1..20}; do
    if curl -s http://localhost:9099 &>/dev/null; then
      success "Emulators ready (PID: $EMULATOR_PID)"
      break
    fi
    sleep 1
    echo -n "."
  done
  echo ""

  # Trap cleanup
  trap 'echo ""; info "Stopping emulators..."; kill $EMULATOR_PID 2>/dev/null; rm -f .emulator.pid' EXIT

else
  # Ensure emulators flag is off when not requested
  if [[ -f "$ENV_FILE" ]]; then
    sed -i.bak 's/VITE_USE_EMULATORS=true/VITE_USE_EMULATORS=false/' "$ENV_FILE" 2>/dev/null || true
    rm -f "${ENV_FILE}.bak"
  fi
fi

# ── 6. Build or Dev ─────────────────────────────────────────────────────────────
if [[ "$RUN_BUILD" == true ]]; then
  step "Building for production"
  npm run build
  success "Build complete → dist/"
  echo ""
  info "Starting preview server..."
  npm run preview

else
  step "Starting development server"
  echo ""
  echo -e "  ${GREEN}${BOLD}PulseChat is starting...${NC}"
  echo -e "  ${CYAN}Local:${NC}   http://localhost:5173"
  echo -e "  ${CYAN}Network:${NC} http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):5173"
  if [[ "$USE_EMULATORS" == true ]]; then
    echo -e "  ${CYAN}Emulator UI:${NC} http://localhost:4000"
  fi
  echo ""
  echo -e "  ${YELLOW}Tip:${NC} Press ${BOLD}Ctrl+C${NC} to stop"
  echo ""

  npm run dev
fi
