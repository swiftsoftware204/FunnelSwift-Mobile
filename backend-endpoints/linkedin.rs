// LinkedIn profile lookup endpoint
// Endpoint: POST /api/v1/leads/linkedin-lookup
// Request body: { "url": "https://linkedin.com/in/username" }
// Response: { "name": "...", "email": "...", "phone": "...", "company": "...", "title": "...", "summary": "..." }

use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct LinkedInLookupRequest {
    pub url: String,
}

#[derive(Serialize, Default)]
pub struct LinkedInLookupResponse {
    pub name: Option<String>,
    pub email: Option<String>,
    pub email_guess: Option<String>,
    pub phone: Option<String>,
    pub company: Option<String>,
    pub title: Option<String>,
    pub headline: Option<String>,
    pub summary: Option<String>,
    pub profile_pic: Option<String>,
}

pub async fn linkedin_lookup(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<LinkedInLookupRequest>,
) -> impl IntoResponse {
    // Validate URL format
    let url = req.url.trim().to_lowercase();
    if !url.starts_with("https://www.linkedin.com/in/") && !url.starts_with("https://linkedin.com/in/") {
        return Json(serde_json::json!({
            "error": "Invalid LinkedIn profile URL. Must be https://linkedin.com/in/username"
        }));
    }

    // Extract username from URL
    let username = url
        .trim_end_matches('/')
        .split("/in/")
        .last()
        .unwrap_or("")
        .split('?')
        .next()
        .unwrap_or("")
        .split('/')
        .next()
        .unwrap_or("");

    if username.is_empty() {
        return Json(serde_json::json!({
            "error": "Could not extract profile username from URL"
        }));
    }

    // TODO: Implement actual LinkedIn profile scraping
    // Options:
    //   1. Playwright/headless browser to render the public profile page
    //   2. n8n webhook to run a Hexomatic scrape (via WorkflowSwift integration)
    //   3. ProxySocial / Tomba / Hunter for email guess
    //
    // For now, return empty — the mobile app shows an error message
    // "Could not extract contact information from this LinkedIn profile"
    // when name and email are both empty, so this is safe.
    //
    // Implementation plan:
    // - Call n8n webhook: POST http://localhost:5678/webhook/linkedin-lookup
    //   with body { username, url }
    // - n8n runs Playwright to fetch public profile
    // - Returns parsed data back to this endpoint

    Json(serde_json::json!(LinkedInLookupResponse::default()))
}
