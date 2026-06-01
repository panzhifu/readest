use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Options for loading a database
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadOptions {
    pub path: String,
    /// Ignored — kept for API compatibility with tauri-plugin-turso
    #[serde(default)]
    pub encryption: Option<serde_json::Value>,
    /// Ignored — FTS5 is always available
    #[serde(default)]
    pub experimental: Vec<String>,
}

/// Result of an execute operation
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryResult {
    pub rows_affected: u64,
    pub last_insert_id: i64,
}

/// Plugin configuration
#[derive(Debug, Clone, Default)]
pub struct Config {
    pub base_path: Option<PathBuf>,
}

/// Config info returned to frontend (stub for API compat)
#[derive(Debug, Clone, Serialize)]
pub struct ConfigInfo {
    pub encrypted: bool,
}

// Keep ping for backwards compatibility
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingRequest {
    pub value: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResponse {
    pub value: Option<String>,
}
