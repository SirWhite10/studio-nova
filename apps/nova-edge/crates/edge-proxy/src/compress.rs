//! Response compression (gzip) middleware.

use axum::body::Body;
use axum::http::{
    header::{ACCEPT_ENCODING, CONTENT_ENCODING, CONTENT_LENGTH, CONTENT_TYPE},
    HeaderValue, Request, Response, StatusCode,
};
use axum::response::IntoResponse;
use bytes::Bytes;

/// Minimum body size to compress (bytes). Smaller bodies are not worth compressing.
const MIN_COMPRESS_SIZE: usize = 256;

/// Check if the client accepts gzip encoding.
pub fn accepts_gzip(headers: &axum::http::HeaderMap) -> bool {
    headers
        .get(ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.contains("gzip"))
        .unwrap_or(false)
}

/// Compress a response body if appropriate.
/// Returns the (possibly compressed) body bytes and whether compression was applied.
pub fn maybe_compress(
    body: Bytes,
    headers: &axum::http::HeaderMap,
) -> (Bytes, bool) {
    if !accepts_gzip(headers) {
        return (body, false);
    }
    if body.len() < MIN_COMPRESS_SIZE {
        return (body, false);
    }

    // Compress with gzip
    use std::io::Write;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
    if encoder.write_all(&body).is_err() {
        return (body, false);
    }
    match encoder.finish() {
        Ok(compressed) => (Bytes::from(compressed), true),
        Err(_) => (body, false),
    }
}

/// Build a compressed response with correct headers.
pub fn compressed_response(
    status: StatusCode,
    body: Bytes,
    content_type: &str,
    accept_encoding: &axum::http::HeaderMap,
) -> Response<Body> {
    let (final_body, compressed) = maybe_compress(body, accept_encoding);

    let mut builder = Response::builder().status(status);
    builder = builder.header(CONTENT_TYPE, content_type);

    if compressed {
        builder = builder.header(CONTENT_ENCODING, "gzip");
    } else {
        builder = builder.header(CONTENT_LENGTH, final_body.len());
    }

    builder.body(Body::from(final_body)).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    fn large_body() -> Bytes {
        let data = "hello world ".repeat(100); // ~1200 bytes
        Bytes::from(data)
    }

    #[test]
    fn test_accepts_gzip_true() {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT_ENCODING, "gzip, deflate".parse().unwrap());
        assert!(accepts_gzip(&headers));
    }

    #[test]
    fn test_accepts_gzip_false() {
        let headers = HeaderMap::new();
        assert!(!accepts_gzip(&headers));
    }

    #[test]
    fn test_compresses_large_body() {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT_ENCODING, "gzip".parse().unwrap());
        let body = large_body();
        let (compressed, was_compressed) = maybe_compress(body.clone(), &headers);
        assert!(was_compressed);
        assert!(compressed.len() < body.len(), "compressed should be smaller");
    }

    #[test]
    fn test_skips_small_body() {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT_ENCODING, "gzip".parse().unwrap());
        let body = Bytes::from_static(b"hi");
        let (_, was_compressed) = maybe_compress(body, &headers);
        assert!(!was_compressed);
    }

    #[test]
    fn test_no_gzip_header_skips() {
        let headers = HeaderMap::new();
        let body = large_body();
        let (_, was_compressed) = maybe_compress(body, &headers);
        assert!(!was_compressed);
    }

    #[test]
    fn test_compressed_response_has_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT_ENCODING, "gzip".parse().unwrap());

        let resp = compressed_response(
            StatusCode::OK,
            large_body(),
            "text/html",
            &headers,
        );

        assert_eq!(resp.status(), StatusCode::OK);
        assert_eq!(
            resp.headers().get(CONTENT_ENCODING).unwrap().to_str().unwrap(),
            "gzip"
        );
    }

    #[test]
    fn test_uncompressed_response_has_content_length() {
        let headers = HeaderMap::new();
        let body = Bytes::from_static(b"small");
        let resp = compressed_response(StatusCode::OK, body.clone(), "text/plain", &headers);
        assert!(resp.headers().get(CONTENT_LENGTH).is_some());
        assert!(resp.headers().get(CONTENT_ENCODING).is_none());
    }
}
