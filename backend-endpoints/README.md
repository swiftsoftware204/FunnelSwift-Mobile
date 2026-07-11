# FunnelSwift Backend — New Endpoints
## Mobile App Lead Capture Endpoints

Add these to the FunnelSwift Rust API (`main.rs` routes and handler modules).

---

### 1. OCR Parse Card — `POST /api/v1/ocr/parse-card`

**File:** `src/handlers/ocr.rs`
**Route:** `.route("/api/v1/ocr/parse-card", post(ocr::parse_card))`

Accepts base64 image data, returns parsed contact fields.

**Current state:** Placeholder returning empty fields. The mobile app's BusinessCardScanner.tsx already falls back to on-device ML Kit OCR (Google ML Kit via expo-camera), so the app works without this endpoint returning real data.

**To implement:**
1. Install Tesseract on VPS: `apt install tesseract-ocr`
2. In the handler, write base64 bytes to temp file
3. Shell out to `tesseract <tmpfile> stdout` to get raw text
4. Parse raw text for name, email, phone (use regex patterns)
5. Return structured response
6. Clean up temp file

**Alternative:** Delegate to n8n webhook that runs Google Vision API:
- `POST http://localhost:5678/webhook/ocr-parse-card`
- n8n sends to Google Cloud Vision
- Returns parsed structure

---

### 2. LinkedIn Lookup — `POST /api/v1/leads/linkedin-lookup`

**File:** `src/handlers/linkedin.rs`
**Route:** `.route("/api/v1/leads/linkedin-lookup", post(linkedin::linkedin_lookup))`

Accepts a LinkedIn profile URL, returns name, email, company, title, summary.

**Current state:** Placeholder returning empty fields. The mobile app shows a clear error: *"Could not extract contact information from this LinkedIn profile. The profile may be private or the URL may be incorrect."*

**To implement (in order of quality):**
1. **n8n + Playwright (recommended):** Create webhook at `localhost:5678/webhook/linkedin-lookup` that uses Playwright node to open the public LinkedIn profile page and scrape visible text
2. **Hexomatic:** If David has Hexomatic API key, use a pre-built LinkedIn scraper template
3. **Third-party API:** Hunter.io or ProxySocial for email guessing from name + company

---

### Route Registration

In `src/main.rs` or `src/routes.rs`, add:

```rust
mod handlers {
    pub mod ocr;
    pub mod linkedin;
}

// In route setup:
.route("/api/v1/ocr/parse-card", post(handlers::ocr::parse_card))
.route("/api/v1/leads/linkedin-lookup", post(handlers::linkedin::linkedin_lookup))
```

### Dependencies needed in Cargo.toml

```toml
base64 = "0.22"
```

Optional (for real OCR):
```toml
# Tesseract bindings (future)
# tesseract = "0.12"
```
