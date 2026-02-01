# Architecture Overview

Understanding how the IPification Showcase works at a high level.

## Table of Contents

- [What is this app?](#what-is-this-app)
- [How it works](#how-it-works)
- [Key Components](#key-components)
- [Authentication Flows](#authentication-flows)
- [Configuration](#configuration)
- [Security](#security)
- [Extending the App](#extending-the-app)
- [Technical Details](#technical-details)

---

## What is this app?

A **showcase/demo application** for IPification authentication services. It demonstrates:

- ✅ Multiple authentication methods (IP, IM, SIM)
- ✅ Phone number verification flows
- ✅ QR code authentication for desktop
- ✅ Multi-server support (stage, live, etc.)

**Tech stack**: Node.js + Express + Pug templates

---

## How it works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Browser   │────────│  This App    │────────│ IPification API │
│             │         │  (Express)   │         │  (OAuth Server) │
└─────────────┘         └──────────────┘         └─────────────────┘

Flow:
1. User clicks button
2. App redirects to IPification
3. User authenticates
4. IPification redirects back
5. App shows user info
```

---

## Key Components

### Frontend

- **Pug Templates**: Login page, user info page
- **JavaScript**: Button handlers, QR code, phone input
- **CSS**: Styling and animations

### Backend

- **Express Routes**: Handle auth flow
- **Session Management**: Track user state
- **OAuth2 Client**: Talk to IPification
- **WebSocket**: For QR code flow (desktop ↔ mobile)

### Configuration

- **auth_servers**: Which IPification servers to use
- **clients**: Which auth flows to enable
- **locale**: UI text customization

---

## Authentication Flows

### Standard Flow (Mobile/Desktop Web)

```
User clicks button
  ↓
/auth/start (redirects to IPification)
  ↓
User authenticates on IPification
  ↓
/auth/callback (receives code)
  ↓
Exchange code for user info
  ↓
Show user info page
```

### QR Code Flow (Desktop + Mobile)

```
Desktop: Generate QR code with auth URL
Mobile: Scan QR → authenticate
Desktop: Receives notification via WebSocket → shows result
```

### SIM Flow (TS43)

```
User clicks SIM button
  ↓
Browser requests SIM credential
  ↓
User confirms on device
  ↓
Show verified phone number
```

---

## Configuration

Three main config files:

1. **config/default.json** - Your setup (auth servers, clients, credentials)
2. **config/locale.json** - UI text labels
3. **config/app_config.json** - App behavior settings

See [CONFIG_DEFAULT_JSON_SAMPLE.md](CONFIG_DEFAULT_JSON_SAMPLE.md) for details.

---

## Security

- ✅ OAuth2 authorization code flow
- ✅ State parameter (CSRF protection)
- ✅ Session management
- ✅ HTTPS recommended for production
- ✅ Helmet.js security headers

---

## Extending the App

### Add new authentication flow

1. Add client config in `config/default.json`
2. Add button in `views/login.pug`
3. Done! Routes handle it automatically

### Add new auth server

1. Add to `auth_servers` array in config
2. Restart app
3. Dropdown appears automatically

### Customize UI text

1. Edit `config/locale.json`
2. Or override in `config/default.json`
3. Restart app

---

## Technical Details

<details>
<summary>📚 Click for detailed architecture diagrams and module structure</summary>

### System Architecture

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Express Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │  Middleware  │  │   Views      │      │
│  │              │  │              │  │   (Pug)       │      │
│  │ - auth.js    │  │ - Session    │  │ - login.pug  │      │
│  │ - user.js    │  │ - Helmet    │  │ - info.pug   │      │
│  │ - device.js  │  │ - Logger    │  │ - qr_*.pug   │      │
│  │ - ts43.js    │  │ - Parser    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Services   │  │   Libraries  │  │   Socket.io   │      │
│  │              │  │              │  │              │      │
│  │ - DataStore  │  │ - Axios      │  │ - Real-time  │      │
│  │ - Notify     │  │ - GeoIP     │  │   Events     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Application Flow

### Standard Authentication Flow

```
┌─────────┐      ┌──────────┐      ┌──────────────┐      ┌──────────┐
│ Browser │      │ Express  │      │ IPification │      │ Browser │
└────┬────┘      └────┬─────┘      └──────┬───────┘      └────┬─────┘
     │                │                   │                   │
     │ GET /auth/start│                   │                   │
     ├───────────────>│                   │                   │
     │                │ Build Auth URL    │                   │
     │                │──────────────────>│                   │
     │                │                   │                   │
     │ 302 Redirect   │                   │                   │
     │<───────────────┤                   │                   │
     │                │                   │                   │
     │                │                   │ User Auth        │
     │                │                   │<─────────────────┤
     │                │                   │                   │
     │                │ Callback          │                   │
     │                │<──────────────────┤                   │
     │                │                   │                   │
     │                │ Exchange Code     │                   │
     │                │──────────────────>│                   │
     │                │                   │                   │
     │                │ Access Token      │                   │
     │                │<──────────────────┤                   │
     │                │                   │                   │
     │                │ Get User Info     │                   │
     │                │──────────────────>│                   │
     │                │                   │                   │
     │                │ User Info         │                   │
     │                │<──────────────────┤                   │
     │                │                   │                   │
     │ 302 Redirect   │                   │                   │
     │<───────────────┤                   │                   │
     │                │                   │                   │
     │ GET /auth/complete                 │                   │
     ├───────────────>│                   │                   │
     │                │                   │                   │
     │ 302 Redirect   │                   │                   │
     │<───────────────┤                   │                   │
     │                │                   │                   │
     │ GET /user/info │                   │                   │
     ├───────────────>│                   │                   │
     │                │                   │                   │
     │ HTML Response │                   │                   │
     │<───────────────┤                   │                   │
```

### QR Code Flow (Desktop)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Desktop  │      │ Express  │      │  Mobile  │      │Express   │
│ Browser  │      │  Server  │      │  Device  │      │ Socket   │
└────┬─────┘      └────┬─────┘      └────┬─────┘      └────┬─────┘
     │                 │                 │                 │
     │ GET /auth/start │                 │                 │
     ├───────────────>│                 │                 │
     │                 │                 │                 │
     │ QR Code Display │                 │                 │
     │<───────────────┤                 │                 │
     │                 │                 │                 │
     │ Socket: init    │                 │                 │
     ├───────────────>│                 │                 │
     │                 │ Join Room       │                 │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │                 │                 │ Scan QR & Auth  │
     │                 │                 │────────────────>│
     │                 │                 │                 │
     │                 │ Callback        │                 │
     │                 │<─────────────────────────────────┤
     │                 │                 │                 │
     │                 │ Socket: url     │                 │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │ Socket Event    │                 │                 │
     │<───────────────┤                 │                 │
     │                 │                 │                 │
     │ Navigate to URL │                 │                 │
     ├───────────────>│                 │                 │
     │                 │                 │                 │
     │ User Info       │                 │                 │
     │<───────────────┤                 │                 │
```

### Server-to-Server Flow (Backchannel)

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Mobile   │      │ Express  │      │IPification│     │  FCM     │
│  App     │      │  Server  │      │   API     │     │          │
└────┬─────┘      └────┬─────┘      └────┬─────┘     └────┬─────┘
     │                 │                 │                 │
     │ POST /device/register             │                 │
     ├───────────────>│                 │                 │
     │                 │                 │                 │
     │ Device Registered                 │                 │
     │<───────────────┤                 │                 │
     │                 │                 │                 │
     │                 │                 │ User Auth       │
     │                 │                 │<────────────────┤
     │                 │                 │                 │
     │                 │ Notification    │                 │
     │                 │<────────────────┤                 │
     │                 │                 │                 │
     │                 │ Send Push       │                 │
     │                 │──────────────────────────────────>│
     │                 │                 │                 │
     │ Push Notification                  │                 │
     │<───────────────────────────────────────────────────┤
     │                 │                 │                 │
     │ POST /auth/s2s/signin              │                 │
     ├───────────────>│                 │                 │
     │                 │                 │                 │
     │ User Info       │                 │                 │
     │<───────────────┤                 │                 │
```

---

## Data Flow

### Session Management

```
Request → Session Middleware → Session Store → Request Object
                                    │
                                    └─> res.locals (template variables)
```

### State Management

```
Auth Start → Generate State → Store in Session → Include in Auth URL
                                                          │
                                                          └─> IPification
                                                          │
Callback ←────────────────────────────────────────────────┘
    │
    └─> Store User Info with State Key
    │
Complete ← Retrieve User Info ← Data Store
```

### Data Store Structure

```
Key Format:                    Value:
─────────────────────────────────────────────────────────────
{state}                        { userInfo, client_id, ... }
{state}-user-info              { raw user info object }
device:{device_id}             { device_token, device_type }
```

---

## Security Architecture

### Security Layers

1. **Helmet.js**: HTTP security headers
2. **Session Management**: Secure session cookies
3. **State Parameter**: CSRF protection
4. **Input Validation**: Parameter validation
5. **Secret Keys**: Environment-based secrets

### Authentication Flow Security

```
┌─────────────────────────────────────────────────────────┐
│                    Security Measures                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. State Parameter (CSRF Protection)                    │
│     - Generated on client                                │
│     - Validated on callback                              │
│                                                           │
│  2. OAuth2 Authorization Code Flow                       │
│     - Short-lived authorization codes                    │
│     - Server-side token exchange                         │
│                                                           │
│  3. Session Management                                    │
│     - HttpOnly cookies                                   │
│     - Secure flag (HTTPS)                                │
│                                                           │
│  4. Secret Management                                     │
│     - Environment variables                              │
│     - Git-ignored config files                          │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Module Structure

### Route Modules

#### `routes/auth.js`

- **Purpose**: Main authentication flow handling
- **Key Functions**:
  - `GET /auth/login`: Render login page
  - `GET /auth/start`: Initiate OAuth flow
  - `GET /auth/callback/:userFlow`: Handle OAuth callback
  - `GET /auth/complete`: Complete authentication
  - `POST /auth/mobile/login`: Mobile login endpoint
  - `POST /auth/s2s/signin`: Server-to-server sign-in

#### `routes/user.js`

- **Purpose**: User information display
- **Key Functions**:
  - `GET /user/info`: Display authenticated user info

#### `routes/device.js`

- **Purpose**: Device registration and push notifications
- **Key Functions**:
  - `POST /device/register`: Register device for push
  - `POST /device/notification/:secret_key`: Receive IPification notifications

#### `routes/ts43.js`

- **Purpose**: TS43 protocol implementation
- **Key Functions**:
  - `POST /ts43/auth`: Initiate TS43 authentication
  - `POST /ts43/token`: Exchange VP token
  - `POST /ts43/log`: Logging endpoint

### Library Modules

#### `lib/data_store.js`

- **Purpose**: Temporary data storage
- **Implementation**: In-memory cache using `cache-manager`
- **TTL**: 60 minutes
- **Usage**: Store authentication state and user information

#### `lib/send_notification.js`

- **Purpose**: Push notification service
- **Implementation**: Firebase Cloud Messaging (FCM)
- **Supports**: Android and iOS devices
- **Configuration**: Requires `firebase_server_key`

### Utility Modules

#### `utils/authServerHelper.js`

- **Purpose**: Auth server lookup and validation utilities
- **Key Functions**:
  - `getAuthServer(authServers, serverId)`: Get server by ID or default to first
  - `getAuthServerIds(authServers)`: Get all available server IDs
  - `hasAuthServer(authServers, serverId)`: Check if server exists

#### `utils/validateConfig.js`

- **Purpose**: Configuration validation on application startup
- **Key Functions**:
  - `validateConfig(config)`: Main validation entry point
  - `validateAuthServers(authServers)`: Validate auth servers array
  - `validateClients(clients)`: Validate client configurations
  - `validateRealm(realm)`: Validate realm configuration
  - `validateCredentials(config)`: Validate OAuth credentials
- **Behavior**: Throws error and prevents app startup if validation fails

#### `utils/helpers.js`

- **Purpose**: General utility functions
- **Key Functions**:
  - `deepMerge(target, source)`: Deep merge objects
  - `findClientByUserFlow(clients, userFlow)`: Find client by flow ID
  - `findClientByClientId(clients, clientId)`: Find client by client ID

#### `utils/constants.js`

- **Purpose**: Application constants
- **Contents**: HTTP status codes, error messages, retry settings

### Socket Module

#### `socket.js`

- **Purpose**: WebSocket server for real-time communication
- **Implementation**: Socket.io
- **Channels**: Room-based (`auth:{state}`)
- **Events**:
  - `init`: Client joins room
  - `messages`: Server sends events

---

## Configuration Management

### Configuration Hierarchy

```
1. Environment Variables (.env)
2. config/default.json
3. Default values in code
```

### Configuration Validation

On application startup, configuration is validated using `utils/validateConfig.js`:

1. **Required Fields**: `realm`, `auth_servers`, `client_id`, `client_secret`, `clients`
2. **Auth Servers**: Must have at least one server with valid `id` and `url`
3. **Clients**: Must have unique `user_flow` values
4. **Behavior**: App crashes on startup if validation fails

See [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md) for field descriptions.

### Configuration Flow

```
app.js → require('config') → config/default.json
         │
         └─> res.locals → Available in templates
```

---

## Error Handling

### Error Flow

```
Error Occurred
    │
    ├─> Try-Catch Block
    │       │
    │       └─> Log Error
    │       │
    │       └─> Error Handler Middleware
    │               │
    │               └─> HTTP Error Response
    │
    └─> OAuth Errors
            │
            └─> Redirect to Login with Error Message
```

---

## Performance Considerations

### Caching Strategy

- **Data Store**: In-memory cache with 60-minute TTL
- **Session Store**: Memory-based (consider Redis for production)
- **Static Assets**: Express static middleware

### Optimization Opportunities

1. **Redis Integration**: Replace in-memory cache with Redis
2. **Session Store**: Use Redis session store for scalability
3. **Rate Limiting**: Implement rate limiting middleware
4. **Connection Pooling**: Configure HTTP client connection pooling

---

## Deployment Architecture

### Docker Deployment

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack             │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────┐      ┌─────────────┐  │
│  │   App       │──────│   Redis     │  │
│  │  Container  │      │  Container  │  │
│  │  Port: 8080 │      │  Port: 6379 │  │
│  └─────────────┘      └─────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Production Considerations

1. **Environment Variables**: Use secrets management
2. **HTTPS**: Configure reverse proxy (nginx/traefik)
3. **Load Balancing**: Multiple app instances
4. **Monitoring**: Application performance monitoring
5. **Logging**: Centralized logging system

---

## Extension Points

### Adding New User Flows

1. Add client configuration to `config/default.json` (see [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md))
2. Add UI button in `views/login.pug`
3. Add JavaScript handler in `public/js/login.js`
4. Flow automatically handled by existing routes

### Adding New Authentication Methods

1. Extend `routes/auth.js` with new endpoint
2. Implement OAuth2/OIDC flow
3. Add UI components
4. Update documentation

### Customizing User Info Display

1. Modify `views/info.pug` template
2. Update `routes/user.js` if needed
3. Customize styling in `public/css/`

---

## Dependencies

### Core Dependencies

- **express**: Web framework
- **express-session**: Session management
- **socket.io**: WebSocket server
- **axios**: HTTP client
- **pug**: Template engine
- **config**: Configuration management

### Security Dependencies

- **helmet**: Security headers
- **cookie-parser**: Cookie parsing

### Utility Dependencies

- **uuid**: UUID generation
- **geoip-lite**: GeoIP lookup
- **cache-manager**: Caching abstraction

---

## Future Enhancements

1. **Redis Integration**: Replace in-memory cache
2. **Rate Limiting**: Add rate limiting middleware
3. **API Versioning**: Implement API versioning
4. **OpenAPI Documentation**: Generate OpenAPI specs
5. **Testing**: Add unit and integration tests
6. **Monitoring**: Add application monitoring
7. **Logging**: Structured logging with correlation IDs

</details>
