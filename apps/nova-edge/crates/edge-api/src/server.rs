use axum::{routing::{delete, get, post}, Router, body::Body, middleware};
use edge_store::DomainStore;
use std::sync::Arc;

use crate::handlers;
use crate::middleware::auth::auth_middleware;

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<dyn DomainStore>,
    pub admin_token: String,
}

pub fn create_router(store: Arc<dyn DomainStore>, admin_token: String) -> Router {
    let state = AppState {
        store: store.clone(),
        admin_token: admin_token.clone(),
    };

    Router::new()
        // Health + resolve (public)
        .route("/health", get(handlers::health::health))
        .route("/resolve", get(handlers::health::resolve))
        // FRP plugin handler
        .route("/frp/handler", post(handlers::frp::handle))
        // Admin API (authenticated)
        .nest("/admin", admin_routes(store, admin_token))
        .with_state(state)
}

fn admin_routes(store: Arc<dyn DomainStore>, admin_token: String) -> Router<AppState> {
    let state = AppState {
        store,
        admin_token,
    };

    Router::new()
        .route("/domains/verify", get(handlers::domains::check_verification))
        .route("/domains/verify", post(handlers::domains::verify))
        .route("/domains/{host}", delete(handlers::domains::remove))
        .route("/proxies", post(handlers::proxies::upsert))
        .route("/proxies/{name}/sync", post(handlers::proxies::sync))
        .route("/proxies/{name}/domains", get(handlers::proxies::list_domains))
        .route("/proxies/{name}", delete(handlers::proxies::disable))
        .route("/studios/{id}/domains", get(handlers::studios::list_domains))
        .layer(middleware::from_fn_with_state(state, auth_middleware))
}
