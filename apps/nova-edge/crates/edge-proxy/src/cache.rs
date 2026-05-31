//! Response caching for static content.

use axum::body::Body;
use axum::http::{Request, Response, StatusCode};
use axum::response::IntoResponse;
use bytes::Bytes;
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use std::sync::Arc;
use std::time::Duration;

/// A cached response entry.
#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub status: StatusCode,
    pub headers: Vec<(String, String)>,
    pub body: Bytes,
    pub cached_at: DateTime<Utc>,
    pub ttl: Duration,
}

impl CacheEntry {
    pub fn new(
        status: StatusCode,
        headers: Vec<(String, String)>,
        body: Bytes,
        ttl: Duration,
    ) -> Self {
        Self {
            status,
            headers,
            body,
            cached_at: Utc::now(),
            ttl,
        }
    }

    /// Check if this entry has expired.
    pub fn is_expired(&self) -> bool {
        let now = Utc::now();
        let age = now.signed_duration_since(self.cached_at);
        age.to_std().unwrap_or(Duration::ZERO) > self.ttl
    }
}

/// Cache key: (host, path, query).
#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct CacheKey {
    pub host: String,
    pub path: String,
    pub query: String,
}

impl CacheKey {
    pub fn from_request(request: &Request<Body>) -> Self {
        let host = request
            .headers()
            .get("host")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("unknown")
            .to_string();
        let uri = request.uri();
        let path = uri.path().to_string();
        let query = uri.query().unwrap_or("").to_string();
        Self { host, path, query }
    }
}

/// In-memory response cache backed by DashMap.
pub struct ResponseCache {
    store: DashMap<CacheKey, CacheEntry>,
    default_ttl: Duration,
}

impl ResponseCache {
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            store: DashMap::new(),
            default_ttl,
        }
    }

    /// Look up a cached response.
    pub fn get(&self, key: &CacheKey) -> Option<CacheEntry> {
        match self.store.get(key) {
            Some(entry) => {
                if entry.is_expired() {
                    drop(entry);
                    self.store.remove(key);
                    None
                } else {
                    Some(entry.clone())
                }
            }
            None => None,
        }
    }

    /// Store a response in the cache.
    pub fn put(&self, key: CacheKey, entry: CacheEntry) {
        self.store.insert(key, entry);
    }

    /// Remove a cached entry.
    pub fn remove(&self, key: &CacheKey) -> bool {
        self.store.remove(key).is_some()
    }

    /// Number of entries in the cache.
    pub fn len(&self) -> usize {
        self.store.len()
    }

    /// Check if cache is empty.
    pub fn is_empty(&self) -> bool {
        self.store.is_empty()
    }

    /// Get the default TTL.
    pub fn default_ttl(&self) -> Duration {
        self.default_ttl
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    #[test]
    fn test_cache_miss_returns_none() {
        let cache = ResponseCache::new(Duration::from_secs(60));
        let key = CacheKey {
            host: "example.com".into(),
            path: "/test".into(),
            query: "".into(),
        };
        assert!(cache.get(&key).is_none());
    }

    #[test]
    fn test_cache_hit_returns_entry() {
        let cache = ResponseCache::new(Duration::from_secs(60));
        let key = CacheKey {
            host: "example.com".into(),
            path: "/page".into(),
            query: "".into(),
        };
        let entry = CacheEntry::new(
            StatusCode::OK,
            vec![("content-type".into(), "text/html".into())],
            Bytes::from_static(b"<html>hello</html>"),
            Duration::from_secs(60),
        );
        cache.put(key.clone(), entry);
        assert!(cache.get(&key).is_some());
        assert_eq!(cache.len(), 1);
    }

    #[test]
    fn test_cache_expiry() {
        let cache = ResponseCache::new(Duration::from_secs(60));
        let key = CacheKey {
            host: "example.com".into(),
            path: "/old".into(),
            query: "".into(),
        };
        let entry = CacheEntry::new(
            StatusCode::OK,
            vec![],
            Bytes::from_static(b"old content"),
            Duration::from_millis(1), // instant expiry
        );
        cache.put(key.clone(), entry);
        // Tiny sleep to ensure expiry
        std::thread::sleep(Duration::from_millis(5));
        assert!(cache.get(&key).is_none(), "should be expired");
    }

    #[test]
    fn test_cache_remove() {
        let cache = ResponseCache::new(Duration::from_secs(60));
        let key = CacheKey {
            host: "example.com".into(),
            path: "/rm".into(),
            query: "".into(),
        };
        let entry = CacheEntry::new(StatusCode::OK, vec![], Bytes::new(), Duration::from_secs(60));
        cache.put(key.clone(), entry);
        assert!(cache.remove(&key));
        assert!(cache.get(&key).is_none());
    }

    #[test]
    fn test_cache_key_from_request() {
        let req = Request::builder()
            .uri("/api/data?q=hello")
            .header("host", "app.example.com")
            .body(Body::empty())
            .unwrap();
        let key = CacheKey::from_request(&req);
        assert_eq!(key.host, "app.example.com");
        assert_eq!(key.path, "/api/data");
        assert_eq!(key.query, "q=hello");
    }

    #[test]
    fn test_different_keys_not_confused() {
        let cache = ResponseCache::new(Duration::from_secs(60));
        let key1 = CacheKey { host: "a.com".into(), path: "/".into(), query: "".into() };
        let key2 = CacheKey { host: "b.com".into(), path: "/".into(), query: "".into() };

        cache.put(key1.clone(), CacheEntry::new(StatusCode::OK, vec![], Bytes::from("a"), Duration::from_secs(60)));
        assert!(cache.get(&key1).is_some());
        assert!(cache.get(&key2).is_none());
    }
}
