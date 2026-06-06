//! Yamux-backed tunnel transport.
//!
//! The server opens one yamux stream per HTTP request, sends a small
//! `DataStreamStart` prelude, then streams raw HTTP/1.1 bytes to the client.
//! The client forwards those bytes to its configured local backend and writes
//! the raw HTTP response back over the same yamux stream.

use bytes::Bytes;
use futures::io::{AsyncReadExt as FuturesAsyncReadExt, AsyncWriteExt as FuturesAsyncWriteExt};
use std::io;
use std::time::Duration;
use thiserror::Error;
use tokio::sync::{mpsc, oneshot};
use tracing::{debug, warn};
use uuid::Uuid;
use yamux::Stream;

use crate::protocol::{
    DataStreamStart, data_stream_start_envelope, read_envelope_futures, write_envelope_futures,
};

/// Command channel owned by a yamux connection driver.
#[derive(Debug)]
pub enum YamuxCommand {
    OpenOutbound {
        reply: oneshot::Sender<yamux::Result<Stream>>,
    },
}

/// Cloneable handle used by public edge request handlers to open data streams.
#[derive(Clone, Debug)]
pub struct TunnelConnector {
    pub run_id: String,
    tx: mpsc::Sender<YamuxCommand>,
    request_timeout: Duration,
}

impl TunnelConnector {
    pub fn new(run_id: impl Into<String>, tx: mpsc::Sender<YamuxCommand>, request_timeout: Duration) -> Self {
        Self { run_id: run_id.into(), tx, request_timeout }
    }

    pub async fn open_stream(&self) -> Result<Stream, TunnelStreamError> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.tx
            .send(YamuxCommand::OpenOutbound { reply: reply_tx })
            .await
            .map_err(|_| TunnelStreamError::ConnectionClosed)?;
        let stream = tokio::time::timeout(self.request_timeout, reply_rx)
            .await
            .map_err(|_| TunnelStreamError::Timeout)?
            .map_err(|_| TunnelStreamError::ConnectionClosed)??;
        Ok(stream)
    }
}

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
    #[error("protocol error: {0}")]
    Protocol(String),
    #[error("io error: {0}")]
    Io(#[from] io::Error),
    #[error("yamux error: {0}")]
    Yamux(#[from] yamux::ConnectionError),
}

/// An abstract request to be forwarded through the tunnel.
#[derive(Debug, Clone)]
pub struct TunnelRequest {
    pub method: String,
    pub host: String,
    pub path: String,
    pub headers: Vec<(String, String)>,
    pub body: Bytes,
}

/// A response received from the tunnel backend.
#[derive(Debug, Clone)]
pub struct TunnelResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Bytes,
}

pub async fn forward_request_over_connector(
    connector: TunnelConnector,
    proxy_name: &str,
    request: &TunnelRequest,
) -> Result<TunnelResponse, TunnelStreamError> {
    let mut stream = connector.open_stream().await?;
    let start = DataStreamStart {
        proxy_name: proxy_name.to_string(),
        request_id: Uuid::new_v4().to_string(),
    };
    let env = data_stream_start_envelope(&start);
    write_envelope_futures(&mut stream, &env)
        .await
        .map_err(|e| TunnelStreamError::Protocol(e.to_string()))?;

    let raw = serialize_http_request(request);
    stream.write_all(&raw).await?;
    stream.close().await?;

    let mut response = Vec::new();
    tokio::time::timeout(connector.request_timeout, stream.read_to_end(&mut response))
        .await
        .map_err(|_| TunnelStreamError::Timeout)??;
    parse_http_response(&response)
}

pub fn serialize_http_request(request: &TunnelRequest) -> Vec<u8> {
    let mut out = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\nContent-Length: {}\r\n",
        request.method,
        request.path,
        request.host,
        request.body.len()
    );
    for (name, value) in &request.headers {
        if name.eq_ignore_ascii_case("host") || name.eq_ignore_ascii_case("content-length") {
            continue;
        }
        out.push_str(name);
        out.push_str(": ");
        out.push_str(value);
        out.push_str("\r\n");
    }
    out.push_str("\r\n");
    let mut bytes = out.into_bytes();
    bytes.extend_from_slice(&request.body);
    bytes
}

pub fn parse_http_response(raw: &[u8]) -> Result<TunnelResponse, TunnelStreamError> {
    let mut headers = [httparse::EMPTY_HEADER; 128];
    let mut resp = httparse::Response::new(&mut headers);
    let status = match resp.parse(raw).map_err(|e| TunnelStreamError::Protocol(e.to_string()))? {
        httparse::Status::Complete(n) => {
            let status = resp.code.unwrap_or(502);
            let mut headers = resp
                .headers
                .iter()
                .map(|h| (h.name.to_string(), String::from_utf8_lossy(h.value).to_string()))
                .collect::<Vec<_>>();
            let mut body = Bytes::copy_from_slice(&raw[n..]);
            if headers.iter().any(|(k, v)| k.eq_ignore_ascii_case("transfer-encoding") && v.to_ascii_lowercase().contains("chunked")) {
                body = Bytes::from(decode_chunked_body(&body)?);
                headers.retain(|(k, _)| !k.eq_ignore_ascii_case("transfer-encoding"));
                headers.retain(|(k, _)| !k.eq_ignore_ascii_case("content-length"));
                headers.push(("Content-Length".into(), body.len().to_string()));
            }
            return Ok(TunnelResponse { status, headers, body });
        }
        httparse::Status::Partial => return Err(TunnelStreamError::Protocol("partial response".into())),
    };
}

fn decode_chunked_body(raw: &[u8]) -> Result<Vec<u8>, TunnelStreamError> {
    let mut out = Vec::new();
    let mut pos = 0usize;
    loop {
        let (line_end, newline_len) = if let Some(i) = raw[pos..].windows(2).position(|w| w == b"\r\n") {
            (pos + i, 2)
        } else if let Some(i) = raw[pos..].iter().position(|b| *b == b'\n') {
            (pos + i, 1)
        } else {
            return Err(TunnelStreamError::Protocol("invalid chunked response: missing size line".into()));
        };
        let size_line = std::str::from_utf8(&raw[pos..line_end])
            .map_err(|e| TunnelStreamError::Protocol(e.to_string()))?
            .trim_end_matches('\r');
        let size_hex = size_line.split(';').next().unwrap_or("").trim();
        let size = usize::from_str_radix(size_hex, 16)
            .map_err(|e| TunnelStreamError::Protocol(format!("invalid chunk size: {e}")))?;
        pos = line_end + newline_len;
        if size == 0 {
            break;
        }
        if raw.len() < pos + size + 1 {
            return Err(TunnelStreamError::Protocol("invalid chunked response: truncated chunk".into()));
        }
        out.extend_from_slice(&raw[pos..pos + size]);
        pos += size;
        if raw.get(pos..pos + 2) == Some(b"\r\n") {
            pos += 2;
        } else if raw.get(pos) == Some(&b'\n') {
            pos += 1;
        } else {
            return Err(TunnelStreamError::Protocol("invalid chunked response: missing chunk terminator".into()));
        }
    }
    Ok(out)
}

pub async fn read_data_stream_start(stream: &mut Stream) -> Result<DataStreamStart, TunnelStreamError> {
    let env = read_envelope_futures(stream)
        .await
        .map_err(|e| TunnelStreamError::Protocol(e.to_string()))?;
    if env.msg_type != "DataStreamStart" {
        return Err(TunnelStreamError::Protocol(format!("expected DataStreamStart, got {}", env.msg_type)));
    }
    env.decode::<DataStreamStart>()
        .map_err(|e| TunnelStreamError::Protocol(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_http_request_with_body() {
        let req = TunnelRequest {
            method: "POST".into(),
            host: "example.com".into(),
            path: "/hello?x=1".into(),
            headers: vec![("X-Test".into(), "yes".into())],
            body: Bytes::from_static(b"abc"),
        };
        let raw = String::from_utf8(serialize_http_request(&req)).unwrap();
        assert!(raw.starts_with("POST /hello?x=1 HTTP/1.1\r\n"));
        assert!(raw.contains("Host: example.com\r\n"));
        assert!(raw.contains("X-Test: yes\r\n"));
        assert!(raw.ends_with("\r\n\r\nabc"));
    }

    #[test]
    fn parses_http_response_status_headers_and_body() {
        let resp = parse_http_response(b"HTTP/1.1 201 Created\r\nContent-Type: text/plain\r\n\r\nhello").unwrap();
        assert_eq!(resp.status, 201);
        assert_eq!(resp.body, Bytes::from_static(b"hello"));
        assert!(resp.headers.iter().any(|(k, v)| k == "Content-Type" && v == "text/plain"));
    }
}
