use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use indexmap::IndexMap;
use rusqlite::Connection;
use serde_json::{Number, Value as JsonValue};
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};
use tokio::sync::Mutex;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};
pub use models::{Config, ConfigInfo, LoadOptions, PingRequest, PingResponse, QueryResult};

pub struct DbInstances(pub Arc<Mutex<HashMap<String, Arc<Mutex<Connection>>>>>);

impl Default for DbInstances {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(HashMap::new())))
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    init_with_config(Config::default())
}

/// Initializes the plugin with custom configuration.
pub fn init_with_config<R: Runtime>(config: Config) -> TauriPlugin<R> {
    Builder::new("sqlite")
        .invoke_handler(tauri::generate_handler![
            commands::load,
            commands::execute,
            commands::batch,
            commands::select,
            commands::close,
            commands::ping,
            commands::get_config,
        ])
        .setup(move |app, _api| {
            let base_path = config
                .base_path
                .unwrap_or_else(|| app.path().app_config_dir().unwrap_or_default());
            app.manage(BasePath(base_path));
            app.manage(DbInstances::default());
            Ok(())
        })
        .build()
}

/// Base path for relative database paths.
pub struct BasePath(pub PathBuf);

/// Convert rusqlite values to JSON compatible with the turso plugin format.
fn row_to_json(
    row: &rusqlite::Row,
    col_names: &[String],
) -> std::result::Result<IndexMap<String, JsonValue>, rusqlite::Error> {
    let mut map = IndexMap::new();
    for (i, name) in col_names.iter().enumerate() {
        let value: rusqlite::types::Value = row.get(i)?;
        let json = match value {
            rusqlite::types::Value::Null => JsonValue::Null,
            rusqlite::types::Value::Integer(i) => JsonValue::Number(Number::from(i)),
            rusqlite::types::Value::Real(f) => Number::from_f64(f)
                .map(JsonValue::Number)
                .unwrap_or(JsonValue::Null),
            rusqlite::types::Value::Text(s) => JsonValue::String(s),
            rusqlite::types::Value::Blob(b) => {
                let arr: Vec<JsonValue> = b
                    .iter()
                    .map(|&x| JsonValue::Number(Number::from(x)))
                    .collect();
                JsonValue::Array(arr)
            }
        };
        map.insert(name.clone(), json);
    }
    Ok(map)
}

/// Convert JSON params to rusqlite-compatible types.
fn json_to_params(values: Vec<JsonValue>) -> Vec<rusqlite::types::Value> {
    values
        .into_iter()
        .map(|v| match v {
            JsonValue::Null => rusqlite::types::Value::Null,
            JsonValue::Bool(b) => rusqlite::types::Value::Integer(if b { 1 } else { 0 }),
            JsonValue::Number(n) => {
                if let Some(i) = n.as_i64() {
                    rusqlite::types::Value::Integer(i)
                } else if let Some(f) = n.as_f64() {
                    rusqlite::types::Value::Real(f)
                } else {
                    rusqlite::types::Value::Null
                }
            }
            JsonValue::String(s) => rusqlite::types::Value::Text(s),
            JsonValue::Array(ref arr) => {
                if arr.iter().all(|v| v.is_number()) {
                    let bytes: Vec<u8> = arr
                        .iter()
                        .filter_map(|v| v.as_u64().map(|n| n as u8))
                        .collect();
                    rusqlite::types::Value::Blob(bytes)
                } else {
                    rusqlite::types::Value::Text(v.to_string())
                }
            }
            JsonValue::Object(_) => rusqlite::types::Value::Text(v.to_string()),
        })
        .collect()
}
