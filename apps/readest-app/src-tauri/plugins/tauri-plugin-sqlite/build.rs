const COMMANDS: &[&str] = &[
    "load",
    "execute",
    "select",
    "batch",
    "close",
    "ping",
    "get_config",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
