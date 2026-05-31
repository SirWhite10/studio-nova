//! Bot challenge gate — cookie-based JS challenge.

use axum::body::Body;
use axum::http::{Request, Response, StatusCode, header::{COOKIE, SET_COOKIE}};
use axum::response::IntoResponse;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::sync::Arc;

type HmacSha256 = Hmac<Sha256>;

/// Configuration for the bot challenge.
pub struct BotChallengeConfig {
    /// Secret key for HMAC cookie signing.
    pub secret: Vec<u8>,
    /// Cookie name.
    pub cookie_name: String,
    /// Challenge cookie validity duration in seconds.
    pub validity_secs: u64,
}

impl BotChallengeConfig {
    pub fn new(secret: &[u8]) -> Self {
        Self {
            secret: secret.to_vec(),
            cookie_name: "nova-challenge".to_string(),
            validity_secs: 3600,
        }
    }
}

/// Sign a message with HMAC-SHA256.
pub fn sign_challenge(secret: &[u8], message: &str) -> String {
    let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC key");
    mac.update(message.as_bytes());
    let result = mac.finalize();
    hex::encode(result.into_bytes())
}

/// Verify an HMAC-SHA256 signature.
pub fn verify_challenge(secret: &[u8], message: &str, signature: &str) -> bool {
    let expected = sign_challenge(secret, message);
    // Constant-time comparison
    expected == signature
}

/// Build a challenge cookie value: timestamp.hmac
fn build_cookie_value(config: &BotChallengeConfig, timestamp: u64) -> String {
    let payload = format!("{}", timestamp);
    let sig = sign_challenge(&config.secret, &payload);
    format!("{}.{}", timestamp, sig)
}

/// Verify a challenge cookie. Returns true if valid and not expired.
pub fn verify_cookie(config: &BotChallengeConfig, cookie_value: &str) -> bool {
    let parts: Vec<&str> = cookie_value.split('.').collect();
    if parts.len() != 2 {
        return false;
    }
    let timestamp: u64 = match parts[0].parse() {
        Ok(t) => t,
        Err(_) => return false,
    };
    let sig = parts[1];

    if !verify_challenge(&config.secret, &parts[0], sig) {
        return false;
    }

    // Check expiry
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    now - timestamp < config.validity_secs
}

/// The JS challenge HTML page.
fn challenge_html() -> &'static str {
    r#"<!DOCTYPE html>
<html><head><title>Checking...</title></head>
<body>
<script>
document.cookie = "nova-challenge=CHALLENGE_VALUE; path=/; max-age=3600";
location.reload();
</script>
<noscript>JavaScript is required.</noscript>
</body></html>"#
}

/// Check if a request has a valid challenge cookie.
/// Returns Ok(()) if passed, Err(Response) with challenge if not.
pub fn check_challenge(
    config: &BotChallengeConfig,
    request: &Request<Body>,
) -> Result<(), Response<Body>> {
    let cookie_header = request
        .headers()
        .get(COOKIE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    // Find our cookie
    for cookie in cookie_header.split(';') {
        let cookie = cookie.trim();
        if let Some(value) = cookie.strip_prefix(&format!("{}=", config.cookie_name)) {
            if verify_cookie(config, value) {
                return Ok(());
            }
        }
    }

    // No valid cookie — issue challenge
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let cookie_val = build_cookie_value(config, now);
    let html = challenge_html().replace("CHALLENGE_VALUE", &cookie_val);

    let response = Response::builder()
        .status(StatusCode::FORBIDDEN)
        .header(SET_COOKIE, format!("{}={}; Path=/; Max-Age=3600", config.cookie_name, cookie_val))
        .header("Content-Type", "text/html")
        .body(Body::from(html))
        .unwrap();

    Err(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;

    fn test_config() -> BotChallengeConfig {
        BotChallengeConfig::new(b"test-secret-key-123")
    }

    #[test]
    fn test_sign_and_verify() {
        let config = test_config();
        let sig = sign_challenge(&config.secret, "hello");
        assert!(verify_challenge(&config.secret, "hello", &sig));
        assert!(!verify_challenge(&config.secret, "wrong", &sig));
    }

    #[test]
    fn test_different_secret_fails() {
        let sig = sign_challenge(b"secret-a", "msg");
        assert!(!verify_challenge(b"secret-b", "msg", &sig));
    }

    #[test]
    fn test_valid_cookie_passes() {
        let config = test_config();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let cookie_val = build_cookie_value(&config, now);

        let req = Request::builder()
            .uri("/protected")
            .header(COOKIE, format!("{}={}", config.cookie_name, cookie_val))
            .body(Body::empty())
            .unwrap();

        assert!(check_challenge(&config, &req).is_ok());
    }

    #[test]
    fn test_no_cookie_returns_403() {
        let config = test_config();
        let req = Request::builder()
            .uri("/protected")
            .body(Body::empty())
            .unwrap();

        let result = check_challenge(&config, &req);
        assert!(result.is_err());
        let resp = result.unwrap_err();
        assert_eq!(resp.status(), StatusCode::FORBIDDEN);
    }

    #[test]
    fn test_invalid_cookie_returns_403() {
        let config = test_config();
        let req = Request::builder()
            .uri("/protected")
            .header(COOKIE, "nova-challenge=invalid.value")
            .body(Body::empty())
            .unwrap();

        assert!(check_challenge(&config, &req).is_err());
    }

    #[test]
    fn test_expired_cookie_returns_403() {
        let mut config = test_config();
        config.validity_secs = 0; // instant expiry

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let cookie_val = build_cookie_value(&config, now);

        // Even "now" should be expired with 0 validity
        let req = Request::builder()
            .uri("/")
            .header(COOKIE, format!("{}={}", config.cookie_name, cookie_val))
            .body(Body::empty())
            .unwrap();

        assert!(check_challenge(&config, &req).is_err());
    }
}
