# FunnelSwift Mobile — Build Summary

## v2.0.0 Changes

### What's New
1. **Business Card Scanner** — Camera-based OCR scanner with frame guide
2. **Tag System** — Lead tagging with 12 system tags across 5 groups
3. **Search & Filter** — Search leads by name/phone/email, filter by status
4. **Edit Lead** — Inline editing of lead details, status, notes, and tags
5. **Scanner Button** — Quick-access scan button on capture screen

### Files Added
- `app/components/BusinessCardScanner.tsx` — OCR scanner component
- `app/components/TagSelector.tsx` — Tag selection modal
- `ARCHITECTURE-v2.md` — Updated architecture docs
- `BUILD-SUMMARY.md` — This file
- `BUSINESS-CARD-SCANNER.md` — Scanner setup docs

### Files Updated
- `app/screens/CaptureScreen.tsx` — Added scanner + tag integration
- `app/screens/LeadsScreen.tsx` — Added search, filters, tags display
- `app/screens/LeadDetailScreen.tsx` — Added edit mode, tags, status selector

### Backend
- OCR endpoint: `POST /api/ocr/parse-card` (Supabase Edge Function)
- Tags table: `contact_tags` (contact_id, tag_name)
- All data shared with FunnelSwift web app

### How to Build
```bash
npm install
npx expo start          # Development
npx eas build --platform android  # Production APK
```
