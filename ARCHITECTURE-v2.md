# FunnelSwift Mobile — Architecture v2

## Overview
React Native (Expo) mobile app for capturing leads on-the-go. Shares Supabase backend with FunnelSwift web app.

## Key Components

### Screens
| Screen | File | Purpose |
|--------|------|---------|
| LoginScreen | app/screens/LoginScreen.tsx | Auth with Supabase |
| HomeScreen | app/screens/HomeScreen.tsx | Dashboard with stats |
| CaptureScreen | app/screens/CaptureScreen.tsx | Lead capture form + scanner |
| LeadsScreen | app/screens/LeadsScreen.tsx | Lead list with search/filter |
| LeadDetailScreen | app/screens/LeadDetailScreen.tsx | View/edit lead details |
| ProfileScreen | app/screens/ProfileScreen.tsx | User settings |

### Components (New in v2)
| Component | File | Purpose |
|-----------|------|---------|
| BusinessCardScanner | app/components/BusinessCardScanner.tsx | OCR scanner with camera frame |
| TagSelector | app/components/TagSelector.tsx | Tag selection modal |

### Data Flow
1. User captures lead via form or business card scan
2. Data sent to Supabase `contacts` table
3. Tags stored in `contact_tags` table (contact_id + tag_name)
4. Tags sync with FunnelSwift web app in real-time

### Authentication
- Uses `@supabase/supabase-js` with Expo SecureStore adapter
- Session persisted across app restarts
- Auto-refresh token support

### Styling
- Dark theme by default (via ThemeContext)
- Color scheme matches FunnelSwift web branding
- Dynamic theming via useTheme() hook
