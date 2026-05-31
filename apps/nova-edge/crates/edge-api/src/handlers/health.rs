use axum::{extract::State, response::Json};
use serde_json::{json, Value};

pub async fn health() -> Json<Value> {
    Json(json!({
        "ok": true,
        "service": "nova-edge",
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

pub async fn resolve() -> Json<Value> {
    // TODO: implement host resolution
    Json(json!({ "ok": true, "message": "resolve endpoint" }))
}
