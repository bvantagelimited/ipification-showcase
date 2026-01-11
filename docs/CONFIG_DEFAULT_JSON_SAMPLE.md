# default.json.sample configuration

This document describes every field in `config/default.json.sample` and how to use it.

## How to use

1. Copy `config/default.json.sample` to `config/default.json`.
2. Fill in the values for your environment (especially `auth_server_url` and client credentials).
3. Restart the app so the config is reloaded.

## Field reference

### Top-level fields

- `realm` (string): Keycloak realm used in auth URLs (for example, `ipification`).
- `title` (string): Page title shown in the browser tab and some templates.
- `auth_server_url` (string): Base URL for the auth server, e.g. `https://api.stage.ipification.com/auth`.
- `show_env_select` (boolean): Controls whether the environment selector is shown on the login page. Set to `false` to hide it.
- `stage_url` (string): Base URL used for the Stage environment selector option.
- `live_url` (string): Base URL used for the Live environment selector option.
- `live_id_url` (string): Base URL used for the Live ID environment selector option.
- `app_logo_url` (string): Logo image URL. Can be a relative path in `public/` (like `/images/logo/vil.svg`) or an absolute URL.
- `app_logo_style` (string): Inline CSS applied to the logo image in the login view (e.g. `width: 50px; height: 50px;`).
- `favicon_url` (string): URL to a favicon image (relative or absolute). Leave empty to use the default.
- `default_country_code` (string): Two-letter country code used when the phone country is not detected (e.g. `vn`).
- `disabled_select_country` (boolean): When `true`, disables the country selector UI and forces the default country.
- `notification_secret_key` (string): Secret key for `/device/notification/:secret_key` validation.
- `firebase_server_key` (string): Firebase Cloud Messaging server key used to send push notifications.
- `clients` (array): List of client configurations, one per user flow. Each object describes a flow button and its OAuth client.
- `locale` (object): Optional overrides for UI text. See `docs/LOCALE.md` for full localization options.

### `clients[]` fields

Each entry defines a user flow and its OAuth client credentials.

- `user_flow` (string): Unique flow ID used in routes and buttons (e.g. `pvn_ip`, `login_ip`, `kyc_phone`).
- `client_id` (string): OAuth client ID for the flow.
- `client_secret` (string): OAuth client secret for the flow.
- `title` (string): Display label for the flow button on the login page.
- `scope` (string): Space-separated scopes requested for the flow (for example, `openid ip:phone_verify`).
- `channel` (string, optional): Channel list for IM flows (space-separated, e.g. `wa viber telegram`).

### Available User Flows

| User Flow       | Description                   | Scope                                 |
| --------------- | ----------------------------- | ------------------------------------- |
| `pvn_ip`        | IP Phone Number Verification  | `openid ip:phone_verify`              |
| `pvn_ip_plus`   | IP+ Phone Number Verification | `openid ip:phone_verify ip:mobile_id` |
| `pvn_im`        | IM Phone Number Verification  | `openid ip:phone_verify`              |
| `pvn_sim`       | SIM Phone Number Verification | `openid`                              |
| `login_ip`      | IP Login                      | `openid ip:phone`                     |
| `login_ip_plus` | IP+ Login                     | `openid ip:mobile_id ip:phone`        |
| `login_im`      | IM Login                      | `openid ip:phone`                     |
| `login_sim`     | SIM Login                     | `openid`                              |
| `anonymous`     | Anonymous Identity            | `openid ip:mobile_id`                 |
| `kyc_phone`     | KYC Data                      | `openid ip:profile`                   |

### `locale` fields

- `locale.app.name` (string): Overrides the application name used in the UI.
- `locale.tabs.pnv` (string): Label for the Phone Number Verification tab.
- `locale.tabs.login` (string): Label for the Login tab.
