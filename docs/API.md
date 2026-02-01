# API Documentation

Quick reference for API endpoints and usage patterns.

## Table of Contents

- [Quick Start](#quick-start)
- [Common Use Cases](#common-use-cases)
- [Essential Endpoints](#essential-endpoints)
  - [Start Authentication](#start-authentication)
  - [Handle Callback](#handle-callback)
  - [Get User Info](#get-user-info)
- [Mobile Integration](#mobile-integration)
- [TS43/SIM Integration](#ts43sim-integration)
- [Configuration API](#configuration-api)
- [Error Handling](#error-handling)
- [Advanced Details](#advanced-details)

---

## Quick Start

**Base URL**: `http://localhost:3000` (development)

**Most Common Flow**:

1. User clicks button → Redirects to `/auth/start`
2. User authenticates → IPification redirects to `/auth/callback`
3. App redirects to `/user/info` → Shows user data

**Authentication**: Session-based (handled automatically)

---

## Common Use Cases

### I want to add authentication to my web app

→ Use `/auth/start` → user authenticates → handle `/auth/callback`

### I want to integrate with mobile app

→ Use `/auth/mobile/login` with authorization code

### I want to use SIM-based verification

→ Use `/ts43/auth` → `/ts43/token` flow (see [TS43 Guide](TS43.md))

### I want to get app configuration

→ Call `/api/config` to get auth_servers, clients, etc.

---

## Essential Endpoints

### Start Authentication

**GET** `/auth/start?user_flow=pvn_ip&server_id=stage&state=abc123`

Starts OAuth flow and redirects user to IPification.

**Required**:

- `user_flow`: Which flow to use (`pvn_ip`, `login_ip`, etc.)
- `state`: Random string for security

**Optional**:

- `server_id`: Which auth server (`stage`, `live`). Defaults to first server
- `phone`: Pre-fill phone number

---

### Handle Callback

**GET** `/auth/callback/:userFlow/:serverId?`

IPification redirects here after authentication. Your app handles this automatically.

**Example**: `/auth/callback/pvn_ip/stage?code=xyz&state=abc`

---

### Get User Info

**GET** `/user/info`

Shows authenticated user information (requires valid session).

---

## Mobile Integration

### POST /auth/mobile/login

Exchange authorization code for user info (for mobile apps).

**Request**:

```json
{
  "client_id": "your_client_id",
  "code": "auth_code",
  "redirect_uri": "your_callback_url",
  "server_id": "stage"
}
```

**Response**: User information JSON

---

## TS43/SIM Integration

For SIM-based verification, see dedicated [TS43 Guide](TS43.md).

**Quick overview**:

1. POST `/ts43/auth` → get digital_request
2. Call Credential Manager
3. POST `/ts43/token` → get user info

---

## Configuration API

### GET /api/config

Get application configuration (auth servers, clients, etc.)

**Response**:

```json
{
  "auth_servers": [
    {"id": "stage", "url": "https://..."}
  ],
  "realm": "ipification",
  "clients": [...]
}
```

---

## Error Handling

**Common Errors**:

| Error                            | Cause                | Solution                        |
| -------------------------------- | -------------------- | ------------------------------- |
| `Invalid server_id`              | Server not in config | Check auth_servers in config    |
| `Client not found`               | Invalid user_flow    | Check clients array in config   |
| `server_id not found in session` | Session expired      | User needs to restart auth flow |

---

## Advanced Details

<details>
<summary>Click to expand detailed endpoint specifications</summary>

#### Detailed Authentication Endpoints

#### Login Page

**GET** `/auth/login`

Display the login page with available authentication options.

**Response**: HTML page (Pug template)

**Query Parameters**: None

---

#### Start Authentication Flow

**GET** `/auth/start`

Initiates the OAuth2/OIDC authentication flow by redirecting to IPification authorization server.

**Query Parameters**:

| Parameter   | Type   | Required | Description                                                      |
| ----------- | ------ | -------- | ---------------------------------------------------------------- |
| `user_flow` | string | Yes      | User flow identifier (e.g., `pvn_ip`, `login_ip`)                |
| `server_id` | string | No       | Auth server ID (e.g., `stage`, `live`). Defaults to first server |
| `phone`     | string | No       | Phone number in E.164 format (e.g., `+1234567890`)               |
| `state`     | string | Yes      | State parameter for OAuth flow (used for CSRF protection)        |

**Example Request**:

```
GET /auth/start?user_flow=pvn_ip&server_id=stage&phone=+1234567890&state=abc123xyz
```

**Response**: HTTP 302 Redirect to IPification authorization server

**Flow**:

1. Validates `server_id` and resolves to auth server URL (defaults to first server if not provided)
2. Validates user flow exists in configuration
3. Validates state parameter
4. Builds authorization URL with OAuth2 parameters
5. Redirects user to IPification authorization server

**Callback URL Format**:
The redirect_uri sent to auth server will be: `/auth/callback/{user_flow}/{server_id}`

**Error Responses**:

| Status Code | Error Message                | Cause                         |
| ----------- | ---------------------------- | ----------------------------- |
| 400         | `Invalid server_id: 'xyz'`   | Server ID not found in config |
| 400         | `No auth servers configured` | auth_servers array is empty   |

---

#### OAuth Callback

**GET** `/auth/callback/:userFlow/:serverId?`

Handles the OAuth2 callback after user authentication.

**Path Parameters**:

| Parameter  | Type   | Required | Description                                                      |
| ---------- | ------ | -------- | ---------------------------------------------------------------- |
| `userFlow` | string | Yes      | User flow identifier (e.g., `pvn_ip`, `login_ip`)                |
| `serverId` | string | No       | Auth server ID (e.g., `stage`, `live`). Defaults to first server |

**Query Parameters**:

| Parameter           | Type   | Required | Description                           |
| ------------------- | ------ | -------- | ------------------------------------- |
| `code`              | string | Yes      | Authorization code from IPification   |
| `state`             | string | Yes      | State parameter (must match original) |
| `error`             | string | No       | Error code if authentication failed   |
| `error_description` | string | No       | Error description                     |

**Example Requests**:

```
GET /auth/callback/pvn_ip/stage?code=abc123&state=xyz789
```

```
GET /auth/callback/login_ip?code=abc123&state=xyz789
(Uses default/first server when serverId not in URL)
```

**Response**:

- Success: HTTP 302 Redirect to `/auth/complete?state=xyz789`
- QR Code Flow: HTTP 302 Redirect to `/auth/qrcode/complete` or `/auth/qrcode/error`
- Backchannel Flow: HTTP 200 (empty body)
- Error: HTTP 302 Redirect to `/auth/login` with error message

**Flow**:

1. Extracts `serverId` from URL path (or defaults to first server)
2. Resolves auth server URL from `serverId`
3. Validates authorization code and state
4. Exchanges authorization code for access token (using same auth server)
5. Retrieves user information using access token
6. Stores user information in data store
7. For QR code flows, emits Socket.io event to desktop browser
8. Redirects to completion endpoint

**Headers**:

- `ip-backchannel-im-auth`: Set to `true` for server-to-server IM flows

**Error Responses**:

| Status Code | Error Message                | Cause                         |
| ----------- | ---------------------------- | ----------------------------- |
| 400         | `Invalid server_id: 'xyz'`   | Server ID not found in config |
| 400         | `No auth servers configured` | auth_servers array is empty   |

---

#### Complete Authentication

**GET** `/auth/complete`

Completes the authentication flow and retrieves stored user information.

**Query Parameters**:

| Parameter | Type   | Required | Description     |
| --------- | ------ | -------- | --------------- |
| `state`   | string | Yes      | State parameter |

**Example Request**:

```
GET /auth/complete?state=xyz789
```

**Response**: HTTP 302 Redirect to `/user/info`

**Flow**:

1. Retrieves user information from data store using state
2. Polls data store (up to 5 attempts with 1-second delay)
3. Sets session variables (`isAuthenticated`, `userData`)
4. Redirects to user info page

---

#### QR Code Success Page

**GET** `/auth/qrcode/complete`

Displays success page after QR code authentication.

**Response**: HTML page (Pug template)

---

#### QR Code Error Page

**GET** `/auth/qrcode/error`

Displays error page if QR code authentication failed.

**Response**: HTML page (Pug template)

---

#### Mobile Login

**POST** `/auth/mobile/login`

Mobile-specific endpoint for exchanging authorization code for user information.

**Request Headers**:

```
Content-Type: application/json
```

**Request Body**:

| Field          | Type   | Required | Description                                                      |
| -------------- | ------ | -------- | ---------------------------------------------------------------- |
| `client_id`    | string | Yes      | OAuth client ID                                                  |
| `code`         | string | Yes      | Authorization code                                               |
| `redirect_uri` | string | Yes      | Callback URL (must match OAuth redirect)                         |
| `server_id`    | string | No       | Auth server ID (e.g., `stage`, `live`). Defaults to first server |

**Example Request**:

```json
{
  "client_id": "webclient2",
  "code": "authorization-code",
  "redirect_uri": "https://example.com/auth/callback/pvn_ip/stage",
  "server_id": "stage"
}
```

**Response**:

```json
{
  "sub": "user-id",
  "phone_number": "+1234567890",
  "phone_number_verified": "true"
}
```

**Status Codes**:

- `200`: Success - Returns user information
- `400`: Invalid server_id or missing required fields
- `401`: Client not found or authentication failed

---

#### Server-to-Server Sign-In

**POST** `/auth/s2s/signin`

Server-to-server sign-in endpoint for retrieving user information.

**Request Body**:

```json
{
  "state": "state-parameter"
}
```

**Response**:

```json
{
  "sub": "user-id",
  "phone_number": "+1234567890",
  ...
}
```

**Status Codes**:

- `200`: Success
- `401`: User information not found

---

---

### Device Management Endpoints

#### Register Device

**POST** `/device/register`

Registers a device for push notifications (used in server-to-server flows).

**Request Body**:

```json
{
  "device_id": "unique-device-id",
  "device_token": "fcm-push-token",
  "device_type": "android"
}
```

**Response**:

```json
{
  "device_id": "unique-device-id",
  "device_token": "fcm-push-token",
  "device_type": "android"
}
```

**Device Types**:

- `android`: Android device
- `ios`: iOS device

**Flow**:

1. Stores device information in data store
2. Key format: `device:{device_id}`

---

#### Receive Notification

**POST** `/device/notification/:secret_key`

Receives notification from IPification server (server-to-server callback).
It use on s2s flow.

**Path Parameters**:

| Parameter    | Type   | Required | Description                                                    |
| ------------ | ------ | -------- | -------------------------------------------------------------- |
| `secret_key` | string | Yes      | Notification secret key (must match `notification_secret_key`) |

**Request Body**:

```json
{
  "state": "device-id",
  "notification_type": "session_completed"
}
```

**Notification Types**:

- `session_completed`: Authentication session completed successfully
- `session_expired`: Authentication session expired

**Response**: HTTP 200 (empty body)

**Status Codes**:

- `200`: Success
- `400`: Invalid secret key or missing parameters

**Flow**:

1. Validates secret key
2. Retrieves device information using state (device_id)
3. Sends push notification to device via Firebase Cloud Messaging (uses `firebase_server_key`)
4. Returns success response

---

---

### TS43 Protocol Endpoints

#### TS43 Authentication

**POST** `/ts43/auth`

Initiates TS43 (SIM-based) authentication flow using CIBA (Client Initiated Backchannel Authentication).

**Request Body**:

```json
{
  "login_hint": "+1234567890",
  "carrier_hint": "carrier-code",
  "client_id": "webclient3",
  "operation": "VerifyPhoneNumber",
  "scope": "openid"
}
```

**Parameters**:

| Parameter      | Type   | Required | Description                                              |
| -------------- | ------ | -------- | -------------------------------------------------------- |
| `login_hint`   | string | No       | Phone number hint                                        |
| `carrier_hint` | string | No       | Carrier code hint                                        |
| `client_id`    | string | Yes      | Client identifier                                        |
| `operation`    | string | No       | Operation type (`VerifyPhoneNumber` or `GetPhoneNumber`) |
| `scope`        | string | No       | OAuth2 scope (defaults to client scope)                  |

**Response**:

```json
{
  "auth_req_id": "auth-request-id",
  "nonce": "nonce-value",
  "digital_request": {
    "protocol": "openid4vp-v1-unsigned",
    "data": {
      "response_type": "vp_token",
      "response_mode": "dc_api",
      "nonce": "nonce-value",
      "dcql_query": {
        "credentials": [...]
      }
    }
  }
}
```

**Status Codes**:

- `200`: Success
- `401`: Client not found
- `500`: Server error

**Flow**:

1. Validates client configuration
2. Calls CIBA auth endpoint to get `auth_req_id`
3. Calls DCQL endpoint to get credential query
4. Returns digital request structure for mobile app

---

#### TS43 Token Exchange

**POST** `/ts43/token`

Exchanges VP token for access token in TS43 flow.

**Request Body**:

```json
{
  "vp_token": "vp-token-value",
  "auth_req_id": "auth-request-id",
  "client_id": "webclient3",
  "nonce": "nonce-value"
}
```

**Response**:

```json
{
  "sub": "user-id",
  "phone_number": "+1234567890",
  ...
}
```

**Status Codes**:

- `200`: Success
- `401`: Client not found
- `500`: Server error

**Flow**:

1. Validates client configuration
2. Calls callback endpoint with VP token
3. Exchanges auth_req_id for access token using CIBA grant type
4. Retrieves user information
5. Sets session and returns user info

---

#### TS43 Log

**POST** `/ts43/log`

Logging endpoint for TS43 debugging.

**Request Body**:

```json
{
  "data": {...}
}
```

**Response**: `"OK"`

---

---

### Utility Endpoints

#### App Config

**GET** `/api/config`

Returns safe application configuration for the frontend (client secrets are removed).

**Response**:

```json
{
  "realm": "ipification",
  "auth_servers": [
    {
      "id": "stage",
      "url": "https://api.stage.ipification.com/auth"
    }
  ],
  "clients": [
    {
      "user_flow": "pvn_ip",
      "client_id": "your-client-id",
      "title": "IP Phone Number Verification",
      "scope": "openid ip:phone_verify"
    }
  ]
}
```

**Flow**:

1. Reads config from `res.locals`
2. Strips `client_secret` from each client entry
3. Returns `auth_servers`, `realm`, and safe `clients`

---

#### GeoIP Lookup

**GET** `/api/geoip`

Returns country code based on client IP address.

**Response**:

```json
{
  "country": "us",
  "ip": "192.168.1.1"
}
```

**Flow**:

1. Extracts client IP from request
2. Performs GeoIP lookup
3. Returns country code (lowercase) and IP address

---

#### User Information

**GET** `/user/info`

Displays authenticated user information (requires valid session).

**Response**: HTML page (Pug template)

**Session Requirements**:

- `isAuthenticated`: Must be `true`
- `userData`: User data object

**Status Codes**:

- `200`: Success (renders info page)
- `302`: Redirects to `/` if not authenticated

---

---

## WebSocket Events (Socket.io)

### Client Events

#### Initialize Connection

**Event**: `init`

**Payload**:

```json
{
  "state": "state-parameter"
}
```

**Description**: Joins client to a room channel for receiving authentication updates.

**Channel Format**: `auth:{state}`

---

### Server Events

#### Connection Confirmed

**Event**: `messages`

**Payload**:

```json
{
  "event_name": "connected",
  "socket_id": "socket-id"
}
```

**Description**: Sent immediately after client connects.

---

#### Authentication URL

**Event**: `messages`

**Payload**:

```json
{
  "event_name": "url",
  "url": "http://example.com/auth/complete?state=xyz789"
}
```

**Description**: Sent when QR code authentication completes. Desktop browser should navigate to the provided URL.

---

---

## Error Handling

### Error Responses

All endpoints follow standard HTTP status codes:

- `200`: Success
- `302`: Redirect
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication failed)
- `404`: Not Found
- `500`: Internal Server Error

### Error Format

For JSON responses:

```json
{
  "error": "Error message",
  "status": 400
}
```

For HTML responses, errors are displayed in modals or redirect to login page with error message in session.

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider implementing rate limiting for production deployments.

---

## Security Considerations

1. **State Parameter**: Always validate state parameter to prevent CSRF attacks
2. **Secret Keys**: Keep notification secret keys secure
3. **HTTPS**: Use HTTPS in production
4. **Session Security**: Configure secure session cookies
5. **Input Validation**: Validate all input parameters

---

## Examples

### Complete Authentication Flow

```bash
# 1. Start authentication
curl "http://localhost:3000/auth/start?user_flow=pvn_ip&state=abc123"

# 2. After user completes authentication, callback is called automatically
# 3. Complete authentication
curl "http://localhost:3000/auth/complete?state=abc123"

# 4. View user info (requires session cookie)
curl -b cookies.txt "http://localhost:3000/user/info"
```

### Mobile Login Flow

```bash
# Exchange authorization code for user info
curl -X POST http://localhost:3000/auth/mobile/login \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "webclient2",
    "code": "authorization-code",
    "redirect_uri": "https://example.com/callback"
  }'
```

### TS43 Flow

```bash
# 1. Initiate TS43 authentication
curl -X POST http://localhost:3000/ts43/auth \
  -H "Content-Type: application/json" \
  -d '{
    "login_hint": "+1234567890",
    "client_id": "webclient3",
    "operation": "VerifyPhoneNumber"
  }'

# 2. Exchange VP token (after mobile app completes)
curl -X POST http://localhost:3000/ts43/token \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "vp-token",
    "auth_req_id": "auth-req-id",
    "client_id": "webclient3",
    "nonce": "nonce-value"
  }'
```

</details>
