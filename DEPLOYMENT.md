# PulseChat — Deployment Guide

## Quick Start

```bash
cd pulsechat
npm install
cp .env.example .env
# Fill in Firebase credentials in .env
npm run dev
```

---

## 1. Firebase Project Setup

### Create the Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `pulsechat` → click through
3. Enable **Google Analytics** (optional but recommended)

### Enable Authentication

1. Firebase Console → **Authentication** → **Get started**
2. Enable **Email/Password** provider
3. Enable **Google** provider → add your authorized domain

### Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Start in **Production mode**
3. Choose region: `us-central1` (or nearest to your users)

### Enable Storage

1. Firebase Console → **Storage** → **Get started**
2. Use default security rules for now (you'll deploy proper rules below)

### Get Web App Credentials

1. Firebase Console → **Project settings** (gear icon) → **Your apps**
2. Click **Add app** → Web (`</>`)
3. App nickname: `pulsechat-web`
4. Register app → copy the `firebaseConfig` object

---

## 2. Environment Variables

Create `.env` from `.env.example`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=pulsechat-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pulsechat-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=pulsechat-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_FIREBASE_VAPID_KEY=BNxxxxxxx...   # From FCM settings
```

### Getting the VAPID Key (for push notifications)

1. Firebase Console → **Project settings** → **Cloud Messaging**
2. Scroll to **Web Push certificates**
3. Click **Generate key pair** → copy the key

---

## 3. Deploy Firebase Rules & Indexes

Install Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase init  # Select: Firestore, Storage, Hosting — use existing project
```

Deploy security rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
firebase deploy --only storage
```

---

## 4. Run Seed Data (Optional)

```bash
# Download service account key from:
# Firebase Console → Project Settings → Service accounts → Generate new private key

export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npx tsx scripts/seed.ts
```

Demo credentials after seeding:
- `alice@demo.com` / `demo1234`
- `bob@demo.com` / `demo1234`
- `charlie@demo.com` / `demo1234`

---

## 5. Development

```bash
npm run dev          # Start dev server at localhost:5173
npm run build        # Production build
npm run preview      # Preview production build
```

### Using Firebase Emulators (Recommended for dev)

```bash
firebase emulators:start
```

Add to `.env.local`:
```env
VITE_USE_EMULATORS=true
```

---

## 6. Production Deployment

### Option A — Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Your app will be live at `https://pulsechat-xxxxx.web.app`

### Option B — Vercel

1. Push to GitHub
2. Import to Vercel
3. Add all `VITE_*` env vars in Vercel project settings
4. Deploy

### Option C — Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```

---

## 7. Firestore Data Schema

```
users/{uid}
  email, username, displayName, avatarUrl, bannerUrl, bio,
  status, customStatus, createdAt, lastSeen, friendIds,
  blockedIds, notificationSettings, themePreference

servers/{serverId}
  name, description, iconUrl, bannerUrl, ownerId, region,
  boostLevel, memberCount, isPublic, vanityUrl, createdAt

serverMembers/{serverId}_{userId}
  userId, serverId, roles[], nickname, joinedAt,
  mutedUntil, isBanned, isMuted

channels/{channelId}
  serverId, name, type, topic, position, categoryId,
  isNSFW, slowModeDelay, lastMessageId, lastMessageAt,
  permissionOverwrites[]

messages/{messageId}
  channelId, serverId, authorId, content, type,
  replyToId, attachments[], mentions[], reactions{},
  isPinned, isEdited, editedAt, createdAt, readBy[]

directMessageChannels/{channelId}
  participantIds[], lastMessageId, lastMessageAt,
  lastMessageContent, unreadCounts{}

directMessages/{messageId}
  dmChannelId, authorId, content, attachments[],
  replyToId, isEdited, createdAt, reactions{}

invites/{inviteId}
  code, serverId, channelId, createdBy, expiresAt,
  maxUses, uses

roles/{roleId}
  serverId, name, color, position, permissions[],
  hoist, mentionable, isDefault

moderationLogs/{logId}
  serverId, action, targetUserId, moderatorId,
  reason, duration, createdAt

notifications/{notificationId}
  userId, type, title, body, isRead, createdAt

presence/{userId}
  status, lastSeen

typing/{channelId}_{userId}
  channelId, userId, username, startedAt, expiresAt

userServers/{userId}_{serverId}
  userId, serverId, joinedAt
```

---

## 8. Scaling to 100k+ Users

### Firestore Optimization
- All queries use composite indexes (see `firestore.indexes.json`)
- Use pagination (50 messages per page) — never fetch entire collections
- Server-side aggregations via Cloud Functions for member counts

### Full-Text Search
At 100k+ users, replace the basic `searchMessages` with:
- **Algolia** (best search quality): `npm install algoliasearch`
- **Typesense** (self-hosted, cheaper): `npm install typesense`
- **Firebase Extension**: Install "Search with Algolia" from Firebase console

### Caching
- Zustand already provides client-side caching of users/messages
- Add Redis via Upstash for server-side rate limiting
- Use Firebase's offline persistence: `enableIndexedDbPersistence(db)`

### CDN & Media
- Firebase Storage automatically uses Google's CDN
- Enable image resizing with Firebase Extensions → "Resize Images"

### Rate Limiting
- Add Cloud Functions for write validation and rate limiting
- Use Firebase App Check to prevent abuse

### Monitoring
- Enable Firebase Performance Monitoring
- Firebase Crashlytics for error tracking
- Set up Firebase Alerts for quota usage

---

## 9. Environment Checklist

Before going to production:

- [ ] Firebase Security Rules deployed
- [ ] Storage Rules deployed
- [ ] Firestore Indexes deployed
- [ ] Environment variables set (all `VITE_*`)
- [ ] Custom domain configured
- [ ] HTTPS enforced
- [ ] Google OAuth authorized domain added
- [ ] Email verification enabled for new accounts
- [ ] Firestore backup enabled (Firebase Console → Firestore → Backups)
- [ ] Budget alerts set in Google Cloud Console
