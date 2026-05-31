use axum::{
    extract::{Path, State},
    response::Json,
    http::StatusCode,
};
use serde_json::{json, Value};

use crate::server::AppState;
use crate::types::ProxyUpsertRequest;

/// POST /admin/proxies
pub async fn upsert(
    State(_state): State<AppState>,
    Json(_body): Json<ProxyUpsertRequest>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: upsert proxy + domains in SurrealDB
    Ok(Json(json!({
        "ok": true,
        "domains": [],
        "message": "proxy upsert not yet implemented"
    })))
}

/// POST /admin/proxies/{name}/sync
pub async fn sync(
    State(_state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: re-sync proxy domains from SurrealDB to cache
    Ok(Json(json!({
        "ok": true,
        "proxy": name,
        "message": "proxy sync not yet implemented"
    })))
}

/// GET /admin/proxies/{name}/domains
pub async fn list_domains(
    State(_state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: list all domains for a proxy
    Ok(Json(json!({
        "ok": true,
        "proxy": name,
        "domains": [],
        "message": "list proxy domains not yet implemented"
    })))
}

/// DELETE /admin/proxies/{name}
pub async fn disable(
    State(_state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    // TODO: disable proxy and all its domains
    Ok(Json(json!({
        "ok": true,
        "proxy": name,
        "disabled": false,
        "message": "proxy disable not yet implemented"
    })))
}
