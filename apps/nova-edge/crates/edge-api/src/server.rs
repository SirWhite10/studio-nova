use axum::{routing::{get, post, delete}, Router};
use edge_store::DomainStore;
use std::sync::Arc;

use crate::handlers;
use crate::middleware::auth::auth_middleware;

pub fn create_router(store: Arc<dyn DomainStore>, admin_token: String) -> Router {
    Router::new()
        // Health + resolve (public)
        .route("/health", get(handlers::health::health))
        .route("/resolve", get(handlers::health::resolve))
        // Admin API (authenticated)
        .nest("/admin", admin_routes(store.clone()))
        // FRP plugin handler
        .route("/frp/handler", post(handlers::frp::handle))
        .with_state(AppState { store, admin_token })
}

fn admin_routes(store: Arc<dyn DomainStore>) -> Router<AppState> {
    Router::new()
        .route("/domains/verify", get(handlers::domains::check_verification))
        .route("/domains/verify", post(handlers::domains::verify))
        .route("/domains/{host}", delete(handlers::domains::remove))
        .route("/proxies", post(handlers::proxies::upsert))
        .route("/proxies/{name}/sync", post(handlers::proxies::sync))
        .route("/proxies/{name}/domains", get(handlers::proxies::list_domains))
        .route("/proxies/{name}", delete(handlers::proxies::disable))
        .route("/studios/{id}/domains", get(handlers::studios::list_domains))
        .layer(axum::middleware::from_fn(auth_middleware))
}

#[derive(Clone)]
pub struct AppState {
    pub store: Arc<dyn DomainStore>,
    pub admin_token: String,
}
