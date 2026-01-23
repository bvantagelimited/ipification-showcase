# app_config.json reference

This document describes `config/app_config.json`, which defines the default UI configuration returned by `GET /api/config`. The server deep-merges this file with any overrides provided via `config/default.json` (or other `config/*` environment files).

## Load and override order

1. The server loads `config/app_config.json` as the baseline.
2. If `config/default.json` contains an `app_config` block, it is deep-merged into the baseline.
3. The merged object is returned in `GET /api/config` as `app_config`.

Practical implication: to override only one field, put it under `app_config` in `config/default.json`.

Example override:

```json
{
  "app_config": {
    "app_config": {
      "min_supported_version": "2.1.1"
    },
    "branding": {
      "app_name": "My Demo"
    }
  }
}
```

## Field reference

### Top-level fields

- `config_version` (string): Version of the config schema. Use for internal tracking.
- `app_config` (object): App versioning and update/maintenance settings.
- `default_environment` (string): Default environment label used by the client (`sandbox`, `production`, `custom`).
- `branding` (object): Branding and color overrides for the client UI.
- `main_screen` (object): Locale strings for the main screen.
- `pnv_screen` (object): Locale strings for the Phone Number Verification screen.
- `ussd_screen` (object): Locale strings and config for USSD verification.
- `global_locale` (object): Global labels and environment names used in the UI.

### `app_config`

- `min_supported_version` (string): Minimum app version allowed to run. Clients below this should force-update.
- `latest_version` (string): Latest available version for update prompts.
- `force_update` (boolean): When `true`, clients should block usage until updated.
- `update_message` (string): Message shown when update is available or required.
- `maintenance_mode` (boolean): When `true`, the app should display maintenance state.
- `maintenance_message` (string): Message shown during maintenance.

### `default_environment`

Values should match keys under `global_locale.environments`. Common values:

- `sandbox`
- `production`
- `custom` (shown as "Live ID" by default)

### `branding`

- `app_name` (string): App name displayed in UI.
- `show_logo` (boolean): Whether to show the logo.
- `logo_url` (string): Logo URL (absolute or static asset).
- `primary_color` (string): Primary color hex (e.g. `#1976D2`).
- `secondary_color` (string): Secondary color hex (e.g. `#424242`).

### `main_screen.locale`

- `title` (string): Main screen title. Supports `\n` for line breaks.
- `footer.privacy_policy` (string): Privacy policy label.
- `footer.privacy_policy_url` (string): Privacy policy URL.

### `pnv_screen.locale`

- `title` (string): Screen title.
- `description` (string): Screen description.
- `country_code_label` (string): Label for country code input.
- `phone_number_label` (string): Label for phone number input.
- `footer.privacy_policy` (string): Privacy policy label.
- `footer.privacy_policy_url` (string): Privacy policy URL.
- `errors.phone_required` (string): Missing phone error text.
- `errors.phone_invalid` (string): Invalid phone error text.
- `errors.country_code_required` (string): Missing country code error text.

### `ussd_screen`

#### `ussd_screen.locale`

- `title` (string): Screen title.
- `description` (string): Screen description.
- `phone_number_label` (string): Label for phone input.
- `ussd_code_label` (string): Label for USSD code input.
- `verify_button` (string): Button label.
- `footer.privacy_policy` (string): Privacy policy label.
- `footer.privacy_policy_url` (string): Privacy policy URL.
- `errors.phone_required` (string): Missing phone error text.
- `errors.permission_required` (string): Missing permission error text.

#### `ussd_screen.config`

- `enabled` (boolean): Enables the USSD verification flow.
- `ussd_code` (string): USSD code to dial (e.g. `*123#`).
- `backend_url` (string): Backend URL used for USSD verification.
- `timeout_ms` (number): Timeout in milliseconds for USSD flow.

### `global_locale`

- `app_name` (string): Global app name shown in shared UI areas.
- `environments` (object): Environment labels for selectors.
  - `sandbox` (string): Label for sandbox environment.
  - `production` (string): Label for production environment.
  - `custom` (string): Label for custom environment.
- `common` (object): Shared labels and button texts.
  - `ok` (string)
  - `cancel` (string)
  - `back` (string)
  - `info_title` (string)

