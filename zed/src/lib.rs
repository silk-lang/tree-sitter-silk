//! Starts Silk's language server, `silk lsp`, for Silk files in Zed.
//!
//! The extension runs the `silk` tool it finds on the worktree's PATH, which serves with the Silk
//! version the folder pins, installing that version automatically when needed. Users can name
//! another binary, or extra arguments and environment, under `lsp.silk.binary` in their Zed
//! settings. `lsp.silk.settings.auto_install` controls automatic installation and takes
//! precedence over `SILK_AUTO_INSTALL` in the environment.

use std::collections::BTreeMap;
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
        let settings = LspSettings::for_worktree(language_server_id.as_ref(), worktree)?;
        server_command(settings, worktree.shell_env(), || worktree.which("silk"))
    }
}

fn server_command(
    settings: LspSettings,
    shell_env: Vec<(String, String)>,
    find_silk: impl FnOnce() -> Option<String>,
) -> Result<zed::Command> {
    let auto_install = settings
        .settings
        .as_ref()
        .and_then(|settings| settings.get("auto_install"))
        .map(|value| {
            value
                .as_bool()
                .ok_or_else(|| "lsp.silk.settings.auto_install must be a boolean".to_string())
        })
        .transpose()?;
    let binary = settings.binary;
    let configured_path = binary.as_ref().and_then(|binary| binary.path.clone());
    let arguments = binary
        .as_ref()
        .and_then(|binary| binary.arguments.clone())
        .unwrap_or_else(|| vec!["lsp".into()]);
    let mut env: BTreeMap<_, _> = shell_env.into_iter().collect();
    if let Some(extra) = binary.and_then(|binary| binary.env) {
        env.extend(extra);
    }
    if let Some(enabled) = auto_install {
        env.insert(
            "SILK_AUTO_INSTALL".into(),
            if enabled { "1" } else { "0" }.into(),
        );
    } else {
        env.entry("SILK_AUTO_INSTALL".into())
            .or_insert_with(|| "1".into());
    }

    let command = match configured_path {
        Some(path) => path,
        None => find_silk().ok_or_else(|| {
            "silk was not found on PATH. Install Silk (https://github.com/silk-lang/silk) \
                 or set lsp.silk.binary.path in your Zed settings."
                .to_string()
        })?,
    };

    Ok(zed::Command {
        command,
        args: arguments,
        env: env.into_iter().collect(),
    })
}

zed::register_extension!(SilkExtension);

#[cfg(test)]
mod tests {
    use super::*;
    use zed::settings::CommandSettings;

    #[test]
    fn default_launcher_installs_missing_toolchains() {
        let command =
            server_command(LspSettings::default(), vec![], || Some("/bin/silk".into())).unwrap();
        assert_eq!(command.command, "/bin/silk");
        assert_eq!(command.args, ["lsp"]);
        assert!(command
            .env
            .contains(&("SILK_AUTO_INSTALL".into(), "1".into())));
    }

    #[test]
    fn shell_can_disable_automatic_installation() {
        let command = server_command(
            LspSettings::default(),
            vec![("SILK_AUTO_INSTALL".into(), "0".into())],
            || Some("/bin/silk".into()),
        )
        .unwrap();
        assert_eq!(command.env, [("SILK_AUTO_INSTALL".into(), "0".into())]);
    }

    #[test]
    fn custom_binary_bypasses_path_lookup_and_settings_override_shell() {
        let binary = CommandSettings {
            path: Some("/custom/silkc".into()),
            arguments: Some(vec!["lsp".into(), "--custom-argument".into()]),
            env: Some([("SILK_AUTO_INSTALL".into(), "0".into())].into()),
        };
        let command = server_command(
            LspSettings {
                binary: Some(binary),
                ..Default::default()
            },
            vec![
                ("SILK_AUTO_INSTALL".into(), "1".into()),
                ("SILK_HOME".into(), "/custom/home".into()),
            ],
            || panic!("a custom binary must work without silk on PATH"),
        )
        .unwrap();
        assert_eq!(command.command, "/custom/silkc");
        assert_eq!(command.args, ["lsp", "--custom-argument"]);
        assert_eq!(
            command.env,
            [
                ("SILK_AUTO_INSTALL".into(), "0".into()),
                ("SILK_HOME".into(), "/custom/home".into()),
            ]
        );
    }

    #[test]
    fn auto_install_setting_overrides_binary_and_shell_environment() {
        for enabled in [false, true] {
            let opposite = if enabled { "0" } else { "1" };
            let settings = zed::serde_json::from_value(zed::serde_json::json!({
                "settings": { "auto_install": enabled },
                "binary": { "env": { "SILK_AUTO_INSTALL": opposite } }
            }))
            .unwrap();
            let command = server_command(
                settings,
                vec![("SILK_AUTO_INSTALL".into(), opposite.into())],
                || Some("/bin/silk".into()),
            )
            .unwrap();
            assert_eq!(
                command.env,
                [(
                    "SILK_AUTO_INSTALL".into(),
                    if enabled { "1" } else { "0" }.into()
                )]
            );
        }
    }

    #[test]
    fn invalid_auto_install_setting_is_reported_instead_of_enabling_downloads() {
        let settings = zed::serde_json::from_value(zed::serde_json::json!({
            "settings": { "auto_install": "false" }
        }))
        .unwrap();
        let error = server_command(settings, vec![], || Some("/bin/silk".into())).unwrap_err();
        assert_eq!(error, "lsp.silk.settings.auto_install must be a boolean");
    }
}
