//! Edge-store: SurrealDB data layer with live query cache.

pub mod client;
pub mod error;
pub mod helpers;
pub mod live_cache;
pub mod memory_store;
pub mod schema;
pub mod store;
pub mod store_config;
pub mod surreal_ext;
pub mod surreal_store;
pub mod types;

pub use error::StoreError;
pub use helpers::{
    normalize_host, generate_token, record_id_string, strip_proxy_prefix,
    proxy_record_id, domain_record_id,
    PROXY_TABLE, DOMAIN_TABLE, FRP_CLIENT_TABLE,
};
pub use store::DomainStore;
pub use store_config::{StoreConfig, StoreSchemaConfig, DatabaseBackend};
pub use surreal_ext::SurrealExt;
pub use types::*;
