use std::path::{Component, PathBuf};
use std::sync::Arc;

use indexmap::IndexMap;
use rusqlite::Connection;
use serde_json::Value as JsonValue;
use tauri::{AppHandle, Manager, Runtime, State};

use crate::error::{Error, Result};
use crate::models::{LoadOptions, PingRequest, PingResponse, QueryResult};
use crate::{json_to_params, row_to_json, BasePath, DbInstances};

/// Load (open) a database connection.
#[tauri::command]
pub(crate) async fn load<R: Runtime>(
    app: AppHandle<R>,
    db_instances: State<'_, DbInstances>,
    options: LoadOptions,
) -> Result<String> {
    let path = options.path.clone();

    // Idempotent: return existing connection
    if db_instances.0.lock().await.contains_key(&path) {
        return Ok(path);
    }

    let base_path = app.state::<BasePath>().0.clone();

    // Resolve path
    let db_path = path.strip_prefix("sqlite:").unwrap_or(&path);
    let full_path = if db_path == ":memory:" {
        PathBuf::from(":memory:")
    } else if PathBuf::from(db_path).is_absolute() {
        PathBuf::from(db_path)
    } else {
        let joined = base_path.join(db_path);
        // Normalize away `..`
        let normalised = joined.components().fold(PathBuf::new(), |mut acc, c| {
            match c {
                Component::ParentDir => {
                    acc.pop();
                }
                Component::CurDir => {}
                _ => acc.push(c),
            }
            acc
        });
        if !normalised.starts_with(&base_path) {
            return Err(Error::Other(format!(
                "path '{}' escapes the base directory",
                db_path
            )));
        }
        normalised
    };

    // Open the database
    let conn = if full_path == PathBuf::from(":memory:") {
        Connection::open_in_memory()
    } else {
        // Create parent directories if needed
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        Connection::open(&full_path)
    }
    .map_err(|e| Error::Sqlite(e))?;

    // Enable WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")
        .map_err(|e| Error::Sqlite(e))?;

    db_instances
        .0
        .lock()
        .await
        .insert(path.clone(), Arc::new(tokio::sync::Mutex::new(conn)));

    Ok(path)
}

/// Execute a query that doesn't return rows.
#[tauri::command]
pub(crate) async fn execute(
    db_instances: State<'_, DbInstances>,
    db: String,
    query: String,
    values: Vec<JsonValue>,
) -> Result<QueryResult> {
    let conn = get_conn(&db_instances, &db).await?;
    let conn = conn.lock().await;
    let params = json_to_params(values);
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();
    let rows_affected = conn.execute(&query, param_refs.as_slice())?;
    let last_insert_id = conn.last_insert_rowid();

    Ok(QueryResult {
        rows_affected: rows_affected as u64,
        last_insert_id,
    })
}

/// Execute a SELECT query and return rows.
#[tauri::command]
pub(crate) async fn select(
    db_instances: State<'_, DbInstances>,
    db: String,
    query: String,
    values: Vec<JsonValue>,
) -> Result<Vec<IndexMap<String, JsonValue>>> {
    let conn = get_conn(&db_instances, &db).await?;
    let conn = conn.lock().await;
    let params = json_to_params(values);
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params
        .iter()
        .map(|v| v as &dyn rusqlite::types::ToSql)
        .collect();

    let mut stmt = conn.prepare(&query)?;
    let col_names: Vec<String> = stmt.column_names().iter().map(|n| n.to_string()).collect();

    let rows = stmt.query_map(param_refs.as_slice(), |row| row_to_json(row, &col_names))?;
    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

/// Execute multiple SQL statements atomically in a single transaction.
#[tauri::command]
pub(crate) async fn batch(
    db_instances: State<'_, DbInstances>,
    db: String,
    queries: Vec<String>,
) -> Result<()> {
    let conn = get_conn(&db_instances, &db).await?;
    let conn = conn.lock().await;
    conn.execute("BEGIN", [])?;
    for query in &queries {
        if let Err(e) = conn.execute(query, []) {
            let _ = conn.execute("ROLLBACK", []);
            return Err(Error::Sqlite(e));
        }
    }
    conn.execute("COMMIT", [])?;
    Ok(())
}

/// Close a database connection.
#[tauri::command]
pub(crate) async fn close(
    db_instances: State<'_, DbInstances>,
    db: Option<String>,
) -> Result<bool> {
    let mut instances = db_instances.0.lock().await;
    if let Some(db) = db {
        instances.remove(&db);
    } else {
        instances.clear();
    }
    Ok(true)
}

/// Ping — stub for API compatibility.
#[tauri::command]
pub(crate) async fn ping<R: Runtime>(
    _app: AppHandle<R>,
    _payload: PingRequest,
) -> Result<PingResponse> {
    Ok(PingResponse::default())
}

/// Get plugin config info — stub for API compatibility.
#[tauri::command]
pub(crate) async fn get_config<R: Runtime>(
    _app: AppHandle<R>,
) -> Result<crate::models::ConfigInfo> {
    Ok(crate::models::ConfigInfo { encrypted: false })
}

async fn get_conn(
    db_instances: &State<'_, DbInstances>,
    db: &str,
) -> Result<Arc<tokio::sync::Mutex<Connection>>> {
    let instances = db_instances.0.lock().await;
    instances
        .get(db)
        .cloned()
        .ok_or_else(|| Error::DatabaseNotLoaded(db.to_string()))
}
