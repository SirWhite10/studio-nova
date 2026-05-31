use axum::{
    extract::{Path, State},
    response::Json,
    http::StatusCode,
};
use serde_json::{json, Value};

use crate::server::AppState;
use crate::types::VerifyDomainRequest;

/// GET /admin/domains/verify?host=...
pub async fn check_verification(
    State(_state): State<AppState>,
    axum::extract::Query(params): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Value>, StatusCode> {
    let host = params.get("host").cloned().unwrap_or_default();
    // TODO: check DNS TXT record for verification
    Ok(Json(json!({
        "ok": true,
        "host": host,
        "verified": false,
        "message": "verification check not yet implemented"
    })))
}

/// POST /admin/domains/verify
pub async fn verify(
    State(_state): State<AppState>,
    Json(_body): Json<VerifyDomainRequest>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: verify domain ownership via DNS TXT record
    Ok(Json(json!({
        "ok": true,
        "verified": false,
        "message": "domain verify not yet implemented"
    })))
}

/// DELETE /admin/domains/{host}
pub async fn remove(
    State(_state): State<AppState>,
    Path(host): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: remove domain from SurrealDB
    Ok(Json(json!({
        "ok": true,
        "host": host,
        "removed": false,
        "message": "domain remove not yet implemented"
    })))
}
