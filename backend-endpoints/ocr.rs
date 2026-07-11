// OCR endpoint handler — parses business card images via base64
// Endpoint: POST /api/v1/ocr/parse-card
// Request body: { "image": "<base64 encoded image data>" }
// Response: { "first_name": "...", "last_name": "...", "email": "...", "phone": "...", "business_name": "...", "website": "...", "title": "...", "address": "..." }

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct ParseCardRequest {
    pub image: String, // base64 encoded image
}

#[derive(Serialize, Default)]
pub struct ParseCardResponse {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub business_name: Option<String>,
    pub website: Option<String>,
    pub title: Option<String>,
    pub address: Option<String>,
}

pub async fn parse_card(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<ParseCardRequest>,
) -> impl IntoResponse {
    // Stage 1: On-device ML Kit (not available server-side)
    // Stage 2: Cloud OCR (Google Vision or Tesseract on VPS)
    // Stage 3: Structured extraction

    // For now, decode base64 and log size, return structured fallback
    // TODO: Integrate Tesseract CLI or cloud vision API
    let img_bytes = match base64_decode(&req.image) {
        Ok(bytes) => bytes,
        Err(e) => {
            return Json(serde_json::json!({
                "error": format!("Invalid image data: {}", e)
            }));
        }
    };

    if img_bytes.len() > 10_000_000 {
        return Json(serde_json::json!({
            "error": "Image too large. Max 10MB."
        }));
    }

    // Placeholder: Returns empty parsed result.
    // In production: call Tesseract CLI or Google Vision API.
    // The mobile app will fall back to on-device ML Kit OCR if server returns empty.
    Json(serde_json::json!(ParseCardResponse::default()))
}

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(input)
        .map_err(|e| e.to_string())
}
