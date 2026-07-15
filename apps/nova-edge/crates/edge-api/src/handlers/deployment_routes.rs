use axum::{Json, extract::State, http::StatusCode};
use edge_store::EdgeRouteResolution;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::server::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivateDeploymentRouteInput {
    pub user_id: String,
    pub studio_id: String,
    pub host: String,
    pub deployment_id: String,
    pub runtime_instance_id: String,
    pub service_key: String,
    pub connector_key: String,
    pub horizon_node_id: String,
}

fn strip_record_prefix(value: &str) -> &str {
    value.split_once(':').map_or(value, |(_, id)| id)
}

fn control_request_matches(
    resolution: &EdgeRouteResolution,
    input: &ActivateDeploymentRouteInput,
) -> bool {
    !resolution.legacy
        && resolution
            .host
            .eq_ignore_ascii_case(input.host.trim_end_matches('.'))
        && resolution.user_id == input.user_id
        && strip_record_prefix(&resolution.studio_id) == strip_record_prefix(&input.studio_id)
        && resolution.proxy_name == input.service_key
        && resolution
            .deployment_id
            .as_deref()
            .is_some_and(|id| strip_record_prefix(id) == strip_record_prefix(&input.deployment_id))
        && resolution.runtime_instance_id.as_deref().is_some_and(|id| {
            strip_record_prefix(id) == strip_record_prefix(&input.runtime_instance_id)
        })
        && resolution.connector_key.as_deref() == Some(input.connector_key.as_str())
        && resolution.horizon_node_id.as_deref().is_some_and(|id| {
            strip_record_prefix(id) == strip_record_prefix(&input.horizon_node_id)
        })
}

pub async fn activate(
    State(state): State<AppState>,
    Json(input): Json<ActivateDeploymentRouteInput>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let resolution = state
        .store
        .resolve_deployment_candidate(
            &input.host,
            &input.deployment_id,
            &input.connector_key,
            &input.horizon_node_id,
        )
        .await
        .map_err(|error| {
            (
                StatusCode::BAD_GATEWAY,
                Json(json!({ "ok": false, "error": error.to_string() })),
            )
        })?
        .ok_or_else(|| {
            (
                StatusCode::CONFLICT,
                Json(json!({ "ok": false, "error": "route graph is not ready" })),
            )
        })?;

    if !control_request_matches(&resolution, &input) {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({
                "ok": false,
                "error": "deployment route identity does not match the authoritative graph"
            })),
        ));
    }
    let registry = state.tunnel_registry.as_ref().ok_or_else(|| {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "ok": false, "error": "native tunnel registry is unavailable" })),
        )
    })?;
    if registry
        .get_connection_for_key(&input.service_key, &input.connector_key)
        .is_none()
    {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({
                "ok": false,
                "error": "authorized connector is not serving this runtime service"
            })),
        ));
    }

    Ok(Json(json!({
        "ok": true,
        "accepted": true,
        "host": resolution.host,
        "serviceKey": resolution.proxy_name,
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn resolution() -> EdgeRouteResolution {
        EdgeRouteResolution {
            host: "app.example.com".into(),
            user_id: "user-one".into(),
            studio_id: "studio:one".into(),
            proxy_name: "release-service.namespace.svc.cluster.local:4173".into(),
            local_ip: "release-service.namespace.svc.cluster.local".into(),
            local_port: 4173,
            deployment_id: Some("deployment:one".into()),
            runtime_instance_id: Some("runtime_instance:one".into()),
            connector_key: Some("habitat-one".into()),
            horizon_node_id: Some("infrastructure_node:horizon-one".into()),
            legacy: false,
        }
    }

    fn input() -> ActivateDeploymentRouteInput {
        ActivateDeploymentRouteInput {
            user_id: "user-one".into(),
            studio_id: "one".into(),
            host: "app.example.com".into(),
            deployment_id: "one".into(),
            runtime_instance_id: "one".into(),
            service_key: "release-service.namespace.svc.cluster.local:4173".into(),
            connector_key: "habitat-one".into(),
            horizon_node_id: "horizon-one".into(),
        }
    }

    #[test]
    fn activation_control_requires_exact_route_identity() {
        assert!(control_request_matches(&resolution(), &input()));
        let mut cross_tenant = input();
        cross_tenant.user_id = "user-two".into();
        assert!(!control_request_matches(&resolution(), &cross_tenant));
        let mut wrong_connector = input();
        wrong_connector.connector_key = "other-habitat".into();
        assert!(!control_request_matches(&resolution(), &wrong_connector));
    }
}
