# FunnelSwift Mobile

**Capture leads on-the-go with the FunnelSwift mobile app.**

## Features

- **Quick Lead Capture** - Add business leads in seconds while on location
- **GPS Location Tagging** - Automatically capture where you met the lead
- **Offline Support** - Works even without internet (syncs when connected)
- **Photo Attachments** - Snap business cards or storefront photos
- **Voice Notes** - Record quick voice memos about the conversation
- **Instant Sync** - Real-time sync with FunnelSwift web dashboard

## Tech Stack

- **Framework:** React Native + Expo
- **Navigation:** React Navigation
- **Backend:** Supabase (same as FunnelSwift web)
- **Storage:** Expo SecureStore for auth tokens
- **Location:** Expo Location
- **Camera:** Expo Camera

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (for testing)

### Installation

```bash
# Clone the repo
git clone https://github.com/SwiftSoftware204/FunnelSwift-Mobile.git
cd funnelswift-mobile

# Install dependencies
npm install

# Start the app
npx expo start
```

### Environment Setup

Create `.env` file:

```env
SUPABASE_URL=https://wtlbpeoabwneitawrrtz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## Building for Production

### Android APK

```bash
# Build APK
npx eas build --platform android --profile preview

# Or build locally
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
```

### iOS (requires Mac + Xcode)

```bash
npx eas build --platform ios
```

## App Structure

```
app/
├── screens/
│   ├── LoginScreen.tsx      # Authentication
│   ├── HomeScreen.tsx       # Dashboard with stats
│   ├── CaptureScreen.tsx    # Lead capture form
│   ├── LeadsScreen.tsx      # List all leads
│   ├── LeadDetailScreen.tsx # View/edit lead
│   └── ProfileScreen.tsx    # User settings
├── components/              # Reusable components
├── lib/
│   ├── supabase.ts         # Supabase client
│   ├── AuthContext.tsx     # Auth state management
│   └── ThemeContext.tsx    # Theme/styling
└── assets/                 # Images, icons
```

## Features in Detail

### Lead Capture Form
- Business name, contact info
- Industry selection
- Lead source tracking
- Notes and voice memos
- Auto GPS location tagging
- Photo attachments

### Lead Management
- View all captured leads
- Search and filter
- Sort by date, score, status
- Quick actions (call, email, WhatsApp)
- Status updates

### Sync
- Real-time with FunnelSwift web
- Offline queue
- Conflict resolution

## Roadmap

- [ ] Business card scanner (OCR)
- [ ] Voice-to-text notes
- [ ] Offline mode
- [ ] Push notifications
- [ ] Lead scoring AI
- [ ] Route optimization
- [ ] Team location tracking

## License

MIT - GGC Holdings
