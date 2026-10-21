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

#[cfg(windows)]
fn utf16z(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(windows)]
#[tauri::command]
fn print_windows(printer_name: String, bytes: Vec<u8>) -> Result<(), String> {
    use windows::Win32::Graphics::Printing::{
        ClosePrinter, DOC_INFO_1W, EndDocPrinter, EndPagePrinter, OpenPrinterW, PRINTER_HANDLE,
        StartDocPrinterW, StartPagePrinter, WritePrinter,
    };
    use windows::core::{PCWSTR, PWSTR};

    if printer_name.trim().is_empty() {
        return Err("Le nom de l’imprimante Windows est vide.".to_string());
    }
    if bytes.is_empty() {
        return Err("Le ticket d’impression est vide.".to_string());
    }

    let printer_name_w = utf16z(printer_name.trim());
    let document_name_w = utf16z("RestoMaster OS");
    let raw_type_w = utf16z("RAW");
    let mut printer = PRINTER_HANDLE::default();

    unsafe {
        OpenPrinterW(PCWSTR(printer_name_w.as_ptr()), &mut printer, None).map_err(|error| {
            format!(
                "Impossible d’ouvrir l’imprimante « {} » : {error}",
                printer_name
            )
        })?;

        let close_result = (|| {
            let document = DOC_INFO_1W {
                pDocName: PWSTR(document_name_w.as_ptr() as *mut _),
                pOutputFile: PWSTR::null(),
                pDatatype: PWSTR(raw_type_w.as_ptr() as *mut _),
            };
            let job = StartDocPrinterW(printer, 1, &document);
            if job == 0 {
                return Err(format!(
                    "Le spouleur n’a pas accepté le document : {:?}",
                    windows::core::Error::from_thread()
                ));
            }
            if !StartPagePrinter(printer).as_bool() {
                return Err(format!(
                    "Impossible de démarrer la page d’impression : {:?}",
                    windows::core::Error::from_thread()
                ));
            }

            let mut written = 0u32;
            let write_result = WritePrinter(
                printer,
                bytes.as_ptr().cast(),
                bytes.len().try_into().map_err(|_| {
                    "Le ticket est trop volumineux pour le spouleur Windows.".to_string()
                })?,
                &mut written,
            );
            let end_page_result = EndPagePrinter(printer).as_bool();
            let end_doc_result = EndDocPrinter(printer).as_bool();

            if !write_result.as_bool() {
                return Err(format!(
                    "Écriture vers le spouleur impossible : {:?}",
                    windows::core::Error::from_thread()
                ));
            }
            if written as usize != bytes.len() {
                return Err(format!(
                    "Écriture incomplète vers le spouleur : {written}/{} octets.",
                    bytes.len()
                ));
            }
            if !end_page_result || !end_doc_result {
                return Err(format!(
                    "Le spouleur n’a pas finalisé le document : {:?}",
                    windows::core::Error::from_thread()
                ));
            }
            Ok(())
        })();
        let _ = ClosePrinter(printer);
        close_result
    }
}

#[cfg(not(windows))]
#[tauri::command]
fn print_windows(_printer_name: String, _bytes: Vec<u8>) -> Result<(), String> {
    Err("L’impression par spouleur Windows n’est disponible que sur Windows.".to_string())
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
        .invoke_handler(tauri::generate_handler![print_tcp, print_windows])
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
