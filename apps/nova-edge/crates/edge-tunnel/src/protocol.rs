//! FRP protocol message types + serialization/deserialization.
//!
//! Defines the wire-format messages used between the tunnel server (edge-tunnel)
//! and FRP-compatible clients. Every message is JSON-encoded over yamux streams.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::str::FromStr;

// ── Message Type Enum ──────────────────────────────────────────────

/// Discriminant for the different FRP control-plane messages.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FrpMessageType {
    Login,
    NewProxy,
    NewWorkConn,
    CloseProxy,
    Heartbeat,
    GeneralResponse,
}

impl fmt::Display for FrpMessageType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Login => write!(f, "Login"),
            Self::NewProxy => write!(f, "NewProxy"),
            Self::NewWorkConn => write!(f, "NewWorkConn"),
            Self::CloseProxy => write!(f, "CloseProxy"),
            Self::Heartbeat => write!(f, "Heartbeat"),
            Self::GeneralResponse => write!(f, "GeneralResponse"),
        }
    }
}

impl FromStr for FrpMessageType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Login" => Ok(Self::Login),
            "NewProxy" => Ok(Self::NewProxy),
            "NewWorkConn" => Ok(Self::NewWorkConn),
            "CloseProxy" => Ok(Self::CloseProxy),
            "Heartbeat" => Ok(Self::Heartbeat),
            "GeneralResponse" => Ok(Self::GeneralResponse),
            other => Err(format!("unknown FRP message type: {other}")),
        }
    }
}

// ── Wire Envelope ──────────────────────────────────────────────────

/// Wraps any message with a type tag so the receiver can dispatch.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FrpEnvelope {
    #[serde(rename = "type")]
    pub msg_type: String,
    #[serde(default)]
    pub payload: serde_json::Value,
}

impl FrpEnvelope {
    pub fn new<T: FrpMessage>(msg: &T) -> Self {
        Self {
            msg_type: T::msg_type().to_string(),
            payload: serde_json::to_value(msg).unwrap_or(serde_json::Value::Null),
        }
    }

    /// Decode a typed message from this envelope.
    pub fn decode<T: FrpMessage + for<'de> Deserialize<'de>>(
        &self,
    ) -> Result<T, serde_json::Error> {
        serde_json::from_value(self.payload.clone())
    }
}

// ── Trait: FrpMessage ──────────────────────────────────────────────

/// Marker trait for FRP protocol messages that know their type discriminant.
pub trait FrpMessage: Serialize + for<'de> Deserialize<'de> + Clone {
    fn msg_type() -> FrpMessageType;
}

// ── Message Structs ────────────────────────────────────────────────

/// Sent by the client immediately after connecting.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Login {
    pub version: String,
    pub hostname: String,
    pub run_id: String,
    pub pool_count: u32,
    pub token: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub constellation_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub habitat_node_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub connector_key: Option<String>,
}

/// Client requests that the server begin routing traffic for a named proxy.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NewProxy {
    pub proxy_name: String,
    pub proxy_type: String,
    #[serde(default)]
    pub use_encryption: bool,
    #[serde(default)]
    pub use_compression: bool,
    #[serde(default)]
    pub custom_domains: Vec<String>,
    #[serde(default)]
    pub locations: Vec<String>,
}

/// Client opens a new worker connection for multiplexed traffic.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NewWorkConn {
    pub run_id: String,
}

/// Client stops routing for a previously-registered proxy.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CloseProxy {
    pub proxy_name: String,
}

/// Keep-alive ping. Echoed back by the server.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Heartbeat {
    pub timestamp: i64,
}

/// Server acknowledgement / error for any control message.
/// `code == 0` means success; any other value is an error.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GeneralResponse {
    pub code: i64,
    #[serde(default)]
    pub msg: String,
}

impl GeneralResponse {
    /// Convenience: success response.
    pub fn ok() -> Self {
        Self {
            code: 0,
            msg: String::new(),
        }
    }

    /// Convenience: error response.
    pub fn error(code: i64, msg: impl Into<String>) -> Self {
        Self {
            code,
            msg: msg.into(),
        }
    }

    pub fn is_ok(&self) -> bool {
        self.code == 0
    }
}

// ── FrpMessage impls ───────────────────────────────────────────────

impl FrpMessage for Login {
    fn msg_type() -> FrpMessageType {
        FrpMessageType::Login
    }
}

impl FrpMessage for NewProxy {
    fn msg_type() -> FrpMessageType {
        FrpMessageType::NewProxy
    }
}

impl FrpMessage for NewWorkConn {
    fn msg_type() -> FrpMessageType {
        FrpMessageType::NewWorkConn
    }
}

impl FrpMessage for CloseProxy {
    fn msg_type() -> FrpMessageType {
        FrpMessageType::CloseProxy
    }
}

impl FrpMessage for Heartbeat {
    fn msg_type() -> FrpMessageType {
        FrpMessageType::Heartbeat
    }
}

impl FrpMessage for GeneralResponse {
    fn msg_type() -> FrpMessageType {
        FrpMessageType::GeneralResponse
    }
}

// ── Helpers ────────────────────────────────────────────────────────

/// Serialize a typed message into the JSON envelope wire format.
pub fn encode<T: FrpMessage>(msg: &T) -> String {
    let envelope = FrpEnvelope::new(msg);
    serde_json::to_string(&envelope).unwrap_or_default()
}

/// Deserialize a JSON string into an `FrpEnvelope`.
pub fn decode_envelope(raw: &str) -> Result<FrpEnvelope, serde_json::Error> {
    serde_json::from_str(raw)
}

// ── Async framed I/O ───────────────────────────────────────────────

pub const MAX_CONTROL_FRAME_BYTES: usize = 64 * 1024;

#[derive(Debug, thiserror::Error)]
pub enum ProtocolError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("control frame too large: {0} bytes")]
    FrameTooLarge(u32),
}

/// Prelude sent on each server-opened data stream before raw HTTP bytes.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DataStreamStart {
    pub proxy_name: String,
    pub request_id: String,
}

impl FrpMessage for DataStreamStart {
    fn msg_type() -> FrpMessageType {
        // Encoded as an envelope type string even though FRP does not define it.
        FrpMessageType::GeneralResponse
    }
}

/// Serialize an envelope as u32 length-prefixed JSON using futures I/O.
pub async fn write_envelope_futures<W>(
    writer: &mut W,
    envelope: &FrpEnvelope,
) -> Result<(), ProtocolError>
where
    W: futures::io::AsyncWrite + Unpin,
{
    use futures::io::AsyncWriteExt;
    let bytes = serde_json::to_vec(envelope)?;
    if bytes.len() > MAX_CONTROL_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(bytes.len() as u32));
    }
    writer
        .write_all(&(bytes.len() as u32).to_be_bytes())
        .await?;
    writer.write_all(&bytes).await?;
    writer.flush().await?;
    Ok(())
}

pub async fn write_message_futures<W, T>(writer: &mut W, msg: &T) -> Result<(), ProtocolError>
where
    W: futures::io::AsyncWrite + Unpin,
    T: FrpMessage,
{
    write_envelope_futures(writer, &FrpEnvelope::new(msg)).await
}

pub async fn read_envelope_futures<R>(reader: &mut R) -> Result<FrpEnvelope, ProtocolError>
where
    R: futures::io::AsyncRead + Unpin,
{
    use futures::io::AsyncReadExt;
    let mut len_buf = [0u8; 4];
    reader.read_exact(&mut len_buf).await?;
    let len = u32::from_be_bytes(len_buf);
    if len as usize > MAX_CONTROL_FRAME_BYTES {
        return Err(ProtocolError::FrameTooLarge(len));
    }
    let mut buf = vec![0u8; len as usize];
    reader.read_exact(&mut buf).await?;
    Ok(serde_json::from_slice(&buf)?)
}

pub fn data_stream_start_envelope(start: &DataStreamStart) -> FrpEnvelope {
    FrpEnvelope {
        msg_type: "DataStreamStart".to_string(),
        payload: serde_json::to_value(start).unwrap_or(serde_json::Value::Null),
    }
}

// ── Tests ──────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── FrpMessageType Display / FromStr ──────────────────────────

    #[test]
    fn frp_message_type_roundtrip() {
        let types = [
            FrpMessageType::Login,
            FrpMessageType::NewProxy,
            FrpMessageType::NewWorkConn,
            FrpMessageType::CloseProxy,
            FrpMessageType::Heartbeat,
            FrpMessageType::GeneralResponse,
        ];
        for t in types {
            let s = t.to_string();
            let parsed: FrpMessageType = s.parse().unwrap();
            assert_eq!(t, parsed, "roundtrip failed for {t:?}");
        }
    }

    #[test]
    fn frp_message_type_unknown() {
        assert!("BadType".parse::<FrpMessageType>().is_err());
    }

    // ── Login roundtrip ───────────────────────────────────────────

    #[test]
    fn login_roundtrip() {
        let msg = Login {
            version: "0.61.0".into(),
            hostname: "worker-01".into(),
            run_id: "abc-123".into(),
            pool_count: 2,
            token: "secret-token".into(),
            constellation_id: None,
            habitat_node_id: None,
            connector_key: None,
        };
        let json = serde_json::to_string(&msg).unwrap();
        let back: Login = serde_json::from_str(&json).unwrap();
        assert_eq!(msg, back);
    }

    #[test]
    fn login_envelope_roundtrip() {
        let msg = Login {
            version: "0.61.0".into(),
            hostname: "worker-01".into(),
            run_id: "run-42".into(),
            pool_count: 1,
            token: "tk".into(),
            constellation_id: None,
            habitat_node_id: None,
            connector_key: None,
        };
        let wire = encode(&msg);
        let env = decode_envelope(&wire).unwrap();
        assert_eq!(env.msg_type, "Login");
        let decoded: Login = env.decode().unwrap();
        assert_eq!(msg, decoded);
    }

    // ── NewProxy roundtrip ────────────────────────────────────────

    #[test]
    fn new_proxy_roundtrip() {
        let msg = NewProxy {
            proxy_name: "my-app".into(),
            proxy_type: "http".into(),
            use_encryption: false,
            use_compression: true,
            custom_domains: vec!["app.example.com".into()],
            locations: vec!["/api".into(), "/ws".into()],
        };
        let wire = encode(&msg);
        let env = decode_envelope(&wire).unwrap();
        assert_eq!(env.msg_type, "NewProxy");
        let decoded: NewProxy = env.decode().unwrap();
        assert_eq!(msg, decoded);
    }

    #[test]
    fn new_proxy_defaults() {
        let json = r#"{"proxy_name":"p","proxy_type":"tcp"}"#;
        let msg: NewProxy = serde_json::from_str(json).unwrap();
        assert!(!msg.use_encryption);
        assert!(!msg.use_compression);
        assert!(msg.custom_domains.is_empty());
        assert!(msg.locations.is_empty());
    }

    // ── NewWorkConn roundtrip ─────────────────────────────────────

    #[test]
    fn new_work_conn_roundtrip() {
        let msg = NewWorkConn {
            run_id: "run-99".into(),
        };
        let wire = encode(&msg);
        let env = decode_envelope(&wire).unwrap();
        assert_eq!(env.msg_type, "NewWorkConn");
        let decoded: NewWorkConn = env.decode().unwrap();
        assert_eq!(msg, decoded);
    }

    // ── CloseProxy roundtrip ──────────────────────────────────────

    #[test]
    fn close_proxy_roundtrip() {
        let msg = CloseProxy {
            proxy_name: "my-app".into(),
        };
        let wire = encode(&msg);
        let env = decode_envelope(&wire).unwrap();
        assert_eq!(env.msg_type, "CloseProxy");
        let decoded: CloseProxy = env.decode().unwrap();
        assert_eq!(msg, decoded);
    }

    // ── Heartbeat roundtrip ───────────────────────────────────────

    #[test]
    fn heartbeat_roundtrip() {
        let msg = Heartbeat {
            timestamp: 1_700_000_000,
        };
        let wire = encode(&msg);
        let env = decode_envelope(&wire).unwrap();
        assert_eq!(env.msg_type, "Heartbeat");
        let decoded: Heartbeat = env.decode().unwrap();
        assert_eq!(msg, decoded);
    }

    // ── GeneralResponse roundtrip ─────────────────────────────────

    #[test]
    fn general_response_roundtrip() {
        let ok = GeneralResponse::ok();
        assert!(ok.is_ok());
        assert_eq!(ok.code, 0);

        let err = GeneralResponse::error(1, "bad token");
        assert!(!err.is_ok());
        assert_eq!(err.code, 1);
        assert_eq!(err.msg, "bad token");

        let wire = encode(&err);
        let env = decode_envelope(&wire).unwrap();
        assert_eq!(env.msg_type, "GeneralResponse");
        let decoded: GeneralResponse = env.decode().unwrap();
        assert_eq!(err, decoded);
    }

    // ── Full encode/decode pipeline ───────────────────────────────

    #[test]
    fn encode_decode_all_types() {
        let messages: Vec<String> = vec![
            encode(&Login {
                version: "1".into(),
                hostname: "h".into(),
                run_id: "r".into(),
                pool_count: 0,
                token: "t".into(),
                constellation_id: None,
                habitat_node_id: None,
                connector_key: None,
            }),
            encode(&NewProxy {
                proxy_name: "p".into(),
                proxy_type: "http".into(),
                use_encryption: false,
                use_compression: false,
                custom_domains: vec![],
                locations: vec![],
            }),
            encode(&NewWorkConn { run_id: "r".into() }),
            encode(&CloseProxy {
                proxy_name: "p".into(),
            }),
            encode(&Heartbeat { timestamp: 123 }),
            encode(&GeneralResponse::ok()),
        ];

        let expected_types = [
            "Login",
            "NewProxy",
            "NewWorkConn",
            "CloseProxy",
            "Heartbeat",
            "GeneralResponse",
        ];

        for (wire, expected) in messages.iter().zip(expected_types.iter()) {
            let env = decode_envelope(wire).unwrap();
            assert_eq!(env.msg_type, *expected);
        }
    }
}
