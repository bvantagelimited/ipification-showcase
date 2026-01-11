# API Documentation

This document provides detailed API endpoint documentation for the IPification Showcase application.

## Base URL

- Development: `http://localhost:3000`
- Production: Configure via environment variables

## Authentication

Most endpoints use session-based authentication. The application uses `express-session` for session management.

## Endpoints

### Authentication Endpoints

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

| Parameter   | Type   | Required | Description                                               |
| ----------- | ------ | -------- | --------------------------------------------------------- |
| `user_flow` | string | Yes      | User flow identifier (e.g., `pvn_ip`, `login_ip`)         |
| `phone`     | string | No       | Phone number in E.164 format (e.g., `+1234567890`)        |
| `state`     | string | Yes      | State parameter for OAuth flow (used for CSRF protection) |

**Example Request**:

```
GET /auth/start?user_flow=pvn_ip&phone=+1234567890&state=abc123xyz
```

**Response**: HTTP 302 Redirect to IPification authorization server

**Flow**:

1. Validates user flow exists in configuration
2. Validates state parameter
3. Builds authorization URL with OAuth2 parameters
4. Redirects user to IPification authorization server

---

#### OAuth Callback

**GET** `/auth/callback/:userFlow`

Handles the OAuth2 callback after user authentication.

**Path Parameters**:

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| `userFlow` | string | Yes      | User flow identifier |

**Query Parameters**:

| Parameter           | Type   | Required | Description                           |
| ------------------- | ------ | -------- | ------------------------------------- |
| `code`              | string | Yes      | Authorization code from IPification   |
| `state`             | string | Yes      | State parameter (must match original) |
| `error`             | string | No       | Error code if authentication failed   |
| `error_description` | string | No       | Error description                     |

**Example Request**:

```
GET /auth/callback/pvn_ip?code=abc123&state=xyz789
```

**Response**:

- Success: HTTP 302 Redirect to `/auth/complete?state=xyz789`
- QR Code Flow: HTTP 302 Redirect to `/auth/qrcode/complete` or `/auth/qrcode/error`
- Backchannel Flow: HTTP 200 (empty body)
- Error: HTTP 302 Redirect to `/auth/login` with error message

**Flow**:

1. Validates authorization code and state
2. Exchanges authorization code for access token
3. Retrieves user information using access token
4. Stores user information in data store
5. For QR code flows, emits Socket.io event to desktop browser
6. Redirects to completion endpoint

**Headers**:

- `ip-backchannel-im-auth`: Set to `true` for server-to-server IM flows

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

Mobile-side login endpoint that exchanges authorization code for user information.

**Request Body**:

```json
{
  "client_id": "webclient2",
  "code": "authorization-code",
  "redirect_uri": "https://example.com/callback"
}
```

**Response**:

```json
{
  "sub": "user-id",
  "phone_number": "+1234567890",
  "phone_number_verified": "true",
  ...
}
```

**Status Codes**:

- `200`: Success
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

### Utility Endpoints

#### GeoIP Lookup

**GET** `/geoip`

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
