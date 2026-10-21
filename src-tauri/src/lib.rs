use std::io::Write;
use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

const DEFAULT_PRINT_TIMEOUT_MS: u64 = 5_000;

fn validate_print_target(host: &str, port: u16) -> Result<(), String> {
    if host.trim().is_empty() {
        return Err("L’adresse de l’imprimante est vide.".to_string());
    }
    if port == 0 {
        return Err("Le port de l’imprimante doit être compris entre 1 et 65535.".to_string());
    }
    Ok(())
}

#[tauri::command]
fn print_tcp(
    host: String,
    port: u16,
    bytes: Vec<u8>,
    timeout_ms: Option<u64>,
) -> Result<(), String> {
    validate_print_target(&host, port)?;
    if bytes.is_empty() {
        return Err("Le ticket d’impression est vide.".to_string());
    }

    let timeout = Duration::from_millis(timeout_ms.unwrap_or(DEFAULT_PRINT_TIMEOUT_MS).max(1));
    let address = format!("{}:{}", host.trim(), port);
    let socket_address = address
        .to_socket_addrs()
        .map_err(|error| format!("Adresse d’imprimante invalide ({address}) : {error}"))?
        .next()
        .ok_or_else(|| format!("Aucune adresse réseau trouvée pour {address}."))?;

    let mut stream = TcpStream::connect_timeout(&socket_address, timeout)
        .map_err(|error| format!("Connexion à l’imprimante {address} impossible : {error}"))?;
    stream.set_write_timeout(Some(timeout)).map_err(|error| {
        format!("Impossible de configurer le délai d’écriture vers {address} : {error}")
    })?;
    stream
        .write_all(&bytes)
        .map_err(|error| format!("Écriture incomplète vers l’imprimante {address} : {error}"))?;
    stream.flush().map_err(|error| {
        format!("Vidage du tampon d’impression vers {address} impossible : {error}")
    })?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![print_tcp])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}

#[cfg(test)]
mod tests {
    use super::validate_print_target;

    #[test]
    fn refuse_une_adresse_vide() {
        assert!(validate_print_target("  ", 9100).is_err());
    }

    #[test]
    fn refuse_le_port_zero() {
        assert!(validate_print_target("192.168.1.20", 0).is_err());
    }
}
