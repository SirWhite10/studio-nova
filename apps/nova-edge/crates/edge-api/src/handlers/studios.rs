use axum::{
    extract::{Path, State},
    response::Json,
    http::StatusCode,
};
use serde_json::{json, Value};

use crate::server::AppState;

/// GET /admin/studios/{id}/domains
pub async fn list_domains(
    State(_state): State<AppState>,
    Path(studio_id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: list all domains for a studio
    Ok(Json(json!({
        "ok": true,
        "studio_id": studio_id,
        "domains": [],
        "message": "studio list domains not yet implemented"
    })))
}
