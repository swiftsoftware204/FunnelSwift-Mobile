# Business Card Scanner Setup

## Overview
The BusinessCardScanner component uses `expo-camera` to capture business card images and sends them to the FunnelSwift OCR backend for text extraction.

## How It Works
1. User opens scanner from Capture screen
2. Camera activates with frame guide overlay
3. User takes photo or picks from gallery
4. Image sent to `POST /api/ocr/parse-card` (Supabase Edge Function)
5. Backend extracts: name, phone, email, company, website
6. Extracted data pre-fills the capture form
7. User reviews and saves

## Backend Endpoint
- **URL:** `POST /api/ocr/parse-card` (or Supabase Edge Function)
- **Input:** Multipart form with `image` field
- **Output:** `{ business_name, first_name, last_name, email, phone, website, address, title }`

## Dependencies
- `expo-camera` — Camera access
- `expo-image-picker` — Gallery access
- `@supabase/supabase-js` — OCR API via functions.invoke

## Fallback
If Supabase Edge Function is unavailable, the scanner falls back to calling the OCR endpoint directly via fetch.
