//! yamux stream management + data forwarding abstraction.
//!
//! Provides a `TunnelStream` that wraps a yamux sub-stream and
//! a `forward_request` stub showing the interface for proxying
//! HTTP requests through the tunnel.

use bytes::Bytes;
use std::io;
use thiserror::Error;
use tracing::{debug, warn};

/// Errors that can occur during tunnel stream operations.
#[derive(Debug, Error)]
pub enum TunnelStreamError {
    #[error("connection closed")]
    ConnectionClosed,

    #[error("read error: {0}")]
    ReadError(String),

    #[error("write error: {0}")]
    WriteError(String),

    #[error("timeout")]
    Timeout,

    #[error("io error: {0}")]
    Io(#[from] io::Error),
}

/// An abstract request to be forwarded through the tunnel.
#[derive(Debug, Clone)]
pub struct TunnelRequest {
    /// HTTP method (GET, POST, etc.)
    pub method: String,
    /// Request host header
    pub host: String,
    /// Request path + query
    pub path: String,
    /// Request headers as (name, value) pairs
    pub headers: Vec<(String, String)>,
    /// Request body bytes
    pub body: Bytes,
}

/// A response received from the tunnel backend.
#[derive(Debug, Clone)]
pub struct TunnelResponse {
    /// HTTP status code
    pub status: u16,
    /// Response headers
    pub headers: Vec<(String, String)>,
    /// Response body bytes
    pub body: Bytes,
}

/// A tunnel stream abstraction wrapping a yamux sub-stream.
///
/// In production, this would wrap `yamux::Stream`. For now it provides
/// the interface and can be mocked in tests.
pub struct TunnelStream {
    /// Read buffer for incoming data (simulated).
    read_buffer: Vec<u8>,
    /// Whether the stream is still open.
    open: bool,
}

impl TunnelStream {
    /// Create a new empty stream.
    pub fn new() -> Self {
        Self {
            read_buffer: Vec::new(),
            open: true,
        }
    }

    /// Create a stream pre-loaded with response data (for testing).
    pub fn with_response(data: Vec<u8>) -> Self {
        Self {
            read_buffer: data,
            open: true,
        }
    }

    /// Write data to the stream (sends to the tunnel client).
    pub fn write(&mut self, data: &[u8]) -> Result<(), TunnelStreamError> {
        if !self.open {
            return Err(TunnelStreamError::ConnectionClosed);
        }
        // In production: write to yamux stream
        debug!(len = data.len(), "Wrote data to tunnel stream");
        Ok(())
    }

    /// Read data from the stream (receives from the tunnel client).
    pub fn read(&mut self, buf: &mut [u8]) -> Result<usize, TunnelStreamError> {
        if !self.open {
            return Err(TunnelStreamError::ConnectionClosed);
        }
        if self.read_buffer.is_empty() {
            return Ok(0);
        }
        let n = std::cmp::min(buf.len(), self.read_buffer.len());
        buf[..n].copy_from_slice(&self.read_buffer[..n]);
        self.read_buffer.drain(..n);
        Ok(n)
    }

    /// Close the stream.
    pub fn close(&mut self) {
        self.open = false;
        debug!("Tunnel stream closed");
    }

    /// Check if the stream is still open.
    pub fn is_open(&self) -> bool {
        self.open
    }
}

impl Default for TunnelStream {
    fn default() -> Self {
        Self::new()
    }
}

/// Forward an HTTP request through a tunnel stream and return the response.
///
/// This is the main data-plane function. In production it would:
/// 1. Serialize the request into HTTP/1.1 format
/// 2. Write it to the yamux sub-stream
/// 3. Read the HTTP response from the stream
/// 4. Parse and return the response
///
/// For now, returns a stub 200 OK response.
pub fn forward_request(
    stream: &mut TunnelStream,
    request: &TunnelRequest,
) -> Result<TunnelResponse, TunnelStreamError> {
    if !stream.is_open() {
        return Err(TunnelStreamError::ConnectionClosed);
    }

    debug!(
        method = %request.method,
        host = %request.host,
        path = %request.path,
        body_len = request.body.len(),
        "Forwarding request through tunnel"
    );

    // Serialize request as HTTP/1.1 (simplified)
    let mut http_request = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\n",
        request.method, request.path, request.host
    );

    for (name, value) in &request.headers {
        http_request.push_str(&format!("{name}: {value}\r\n"));
    }

    if !request.body.is_empty() {
        http_request.push_str(&format!("Content-Length: {}\r\n", request.body.len()));
    }
    http_request.push_str("\r\n");

    // Write the request to the stream
    stream.write(http_request.as_bytes())?;
    if !request.body.is_empty() {
        stream.write(&request.body)?;
    }

    // In a real implementation, we'd read the HTTP response from the stream.
    // For the stub, return a 200 OK.
    let response = TunnelResponse {
        status: 200,
        headers: vec![
            ("Content-Type".into(), "text/plain".into()),
            ("X-Forwarded-By".into(), "nova-edge".into()),
        ],
        body: Bytes::from_static(b"OK"),
    };

    debug!(status = response.status, "Received response from tunnel");
    Ok(response)
}

/// Forward a request using a mock stream pre-loaded with serialized response data.
/// Useful for tests.
pub fn forward_request_with_mock_response(
    stream: &mut TunnelStream,
    request: &TunnelRequest,
) -> Result<TunnelResponse, TunnelStreamError> {
    // Read mock data from the stream
    let mut buf = vec![0u8; 4096];
    let n = stream.read(&mut buf)?;
    if n == 0 {
        // No mock data — return default
        return forward_request(stream, request);
    }

    // In a real implementation, parse HTTP response from buf
    let response = TunnelResponse {
        status: 200,
        headers: vec![],
        body: Bytes::copy_from_slice(&buf[..n]),
    };
    Ok(response)
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stream_new_is_open() {
        let stream = TunnelStream::new();
        assert!(stream.is_open());
    }

    #[test]
    fn stream_close() {
        let mut stream = TunnelStream::new();
        assert!(stream.is_open());
        stream.close();
        assert!(!stream.is_open());
    }

    #[test]
    fn stream_write_after_close_errors() {
        let mut stream = TunnelStream::new();
        stream.close();
        let result = stream.write(b"data");
        assert!(result.is_err());
        match result.unwrap_err() {
            TunnelStreamError::ConnectionClosed => {}
            other => panic!("Expected ConnectionClosed, got {other}"),
        }
    }

    #[test]
    fn stream_read_after_close_errors() {
        let mut stream = TunnelStream::new();
        stream.close();
        let mut buf = [0u8; 16];
        let result = stream.read(&mut buf);
        assert!(result.is_err());
    }

    #[test]
    fn stream_write_when_open_succeeds() {
        let mut stream = TunnelStream::new();
        let result = stream.write(b"hello");
        assert!(result.is_ok());
    }

    #[test]
    fn stream_read_from_buffer() {
        let mut stream = TunnelStream::with_response(vec![1, 2, 3, 4, 5]);
        let mut buf = [0u8; 10];
        let n = stream.read(&mut buf).unwrap();
        assert_eq!(n, 5);
        assert_eq!(&buf[..5], &[1, 2, 3, 4, 5]);
    }

    #[test]
    fn stream_read_empty_returns_zero() {
        let mut stream = TunnelStream::new();
        let mut buf = [0u8; 10];
        let n = stream.read(&mut buf).unwrap();
        assert_eq!(n, 0);
    }

    #[test]
    fn forward_request_basic() {
        let mut stream = TunnelStream::new();
        let request = TunnelRequest {
            method: "GET".into(),
            host: "test.example.com".into(),
            path: "/api/health".into(),
            headers: vec![("Accept".into(), "application/json".into())],
            body: Bytes::new(),
        };

        let response = forward_request(&mut stream, &request).unwrap();
        assert_eq!(response.status, 200);
        assert!(!response.body.is_empty());
    }

    #[test]
    fn forward_request_with_body() {
        let mut stream = TunnelStream::new();
        let request = TunnelRequest {
            method: "POST".into(),
            host: "test.example.com".into(),
            path: "/api/data".into(),
            headers: vec![("Content-Type".into(), "application/json".into())],
            body: Bytes::from_static(br#"{"key":"value"}"#),
        };

        let response = forward_request(&mut stream, &request).unwrap();
        assert_eq!(response.status, 200);
    }

    #[test]
    fn forward_request_closed_stream() {
        let mut stream = TunnelStream::new();
        stream.close();

        let request = TunnelRequest {
            method: "GET".into(),
            host: "test.example.com".into(),
            path: "/".into(),
            headers: vec![],
            body: Bytes::new(),
        };

        let result = forward_request(&mut stream, &request);
        assert!(result.is_err());
    }

    #[test]
    fn forward_request_with_mock_response() {
        let mut stream = TunnelStream::with_response(b"mock response body".to_vec());
        let request = TunnelRequest {
            method: "GET".into(),
            host: "test.example.com".into(),
            path: "/".into(),
            headers: vec![],
            body: Bytes::new(),
        };

        let response = forward_request(&mut stream, &request).unwrap();
        assert_eq!(response.status, 200);
        assert_eq!(&response.body[..], b"mock response body");
    }

    #[test]
    fn tunnel_request_clone() {
        let req = TunnelRequest {
            method: "GET".into(),
            host: "h".into(),
            path: "/p".into(),
            headers: vec![],
            body: Bytes::from_static(b"body"),
        };
        let cloned = req.clone();
        assert_eq!(cloned.method, "GET");
        assert_eq!(cloned.host, "h");
    }

    #[test]
    fn tunnel_response_clone() {
        let resp = TunnelResponse {
            status: 404,
            headers: vec![],
            body: Bytes::from_static(b"not found"),
        };
        let cloned = resp.clone();
        assert_eq!(cloned.status, 404);
    }
}
