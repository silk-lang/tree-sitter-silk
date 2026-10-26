//! Starts Silk's language server, `silk lsp`, for Silk files in Zed.
//!
//! The extension runs the `silk` tool it finds on the worktree's PATH, which serves with the Silk
//! version the folder pins (or offers to install it). Users can name another binary, or extra
//! arguments and environment, under `lsp.silk.binary` in their Zed settings. Zed does not allow
//! extensions to bundle a language server, so nothing is downloaded.

use zed_extension_api::{self as zed, settings::LspSettings, LanguageServerId, Result};

struct SilkExtension;

impl zed::Extension for SilkExtension {
    fn new() -> Self {
        SilkExtension
    }

    fn language_server_command(
        &mut self,
        language_server_id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let binary = LspSettings::for_worktree(language_server_id.as_ref(), worktree)
            .ok()
            .and_then(|settings| settings.binary);
        let configured_path = binary.as_ref().and_then(|binary| binary.path.clone());
        let arguments = binary
            .as_ref()
            .and_then(|binary| binary.arguments.clone())
            .unwrap_or_else(|| vec!["lsp".into()]);
        let mut env = worktree.shell_env();
        if let Some(extra) = binary.and_then(|binary| binary.env) {
            env.extend(extra);
        }

        let command = match configured_path {
            Some(path) => path,
            None => worktree.which("silk").ok_or_else(|| {
                "silk was not found on PATH. Install Silk (https://github.com/silk-lang/silk) \
                 or set lsp.silk.binary.path in your Zed settings."
                    .to_string()
            })?,
        };

        Ok(zed::Command {
            command,
            args: arguments,
            env,
        })
    }
}

zed::register_extension!(SilkExtension);
