use axum::{
    extract::State,
    response::Json,
    http::StatusCode,
};
use serde_json::{json, Value};

use crate::server::AppState;

/// POST /frp/handler — FRP plugin auth handler
pub async fn handle(
    State(_state): State<AppState>,
    Json(_body): Json<serde_json::Value>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: validate frpc token, return proxy routing info
    Ok(Json(json!({
        "ok": true,
        "message": "frp handler not yet implemented"
    })))
}
