# IPification Showcase

A demonstration application showcasing IPification's identity verification and authentication features.

## Quick Start

```bash
# Install dependencies
npm install

# Configure application
cp config/default.json.sample config/default.json
# Edit config/default.json with your IPification credentials

# Start server
npm start
```

Access at `http://<your-ip-address>:3000`

📖 **For detailed documentation, see [docs/](docs/) folder:**

- [Quick Start Guide](docs/QUICKSTART.md) - Get started in 5 minutes
- [API Documentation](docs/API.md) - Complete API reference
- [Architecture](docs/ARCHITECTURE.md) - System design and architecture

## Features

- **Phone Number Verification** (IP, IP+, IM, SIM)
- **Quick Access Login** (IP, IP+, IM, SIM)
- **Identity Services** (Anonymous Identity, KYC)
- **QR Code Desktop Flow**
- **Server-to-Server Backchannel**
- **TS43 Protocol Support**

## Prerequisites

- Node.js >= 22.x
- IPification account credentials

## Configuration

Edit `config/default.json` with your client credentials:

```json
{
  "realm": "ipification",
  "auth_server_url": "https://api.stage.ipification.com/auth",
  "clients": [
    {
      "user_flow": "pvn_ip",
      "client_id": "your-client-id",
      "client_secret": "your-client-secret",
      "title": "IP Phone Number Verification",
      "scope": "openid ip:phone_verify"
    }
  ]
}
```

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for configuration details.

## Environment Variables

| Variable                  | Description                          | Default       |
| ------------------------- | ------------------------------------ | ------------- |
| `PORT`                    | Server port                          | `3000`        |
| `NODE_ENV`                | Environment                          | `development` |
| `STAGE_URL`               | Stage environment URL                | -             |
| `LIVE_URL`                | Live environment URL                 | -             |
| `LIVE_ID_URL`             | Live ID environment URL              | -             |
| `NOTIFICATION_SECRET_KEY` | Secret key for notification endpoint | -             |
| `FIREBASE_SERVER_KEY`     | Firebase Cloud Messaging server key  | -             |

## Available User Flows

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

## Docker Deployment

```bash
docker-compose up -d
```

Access at `http://localhost:3001`

## Development

```bash
npm run dev  # Start with auto-reload
```

## Documentation

- **[Quick Start](docs/QUICKSTART.md)** - Setup guide and common issues
- **[API Reference](docs/API.md)** - Complete endpoint documentation
- **[Architecture](docs/ARCHITECTURE.md)** - System design and components
- **[Documentation Index](docs/INDEX.md)** - Documentation overview

## Support

- Developer Portal: https://developer.ipification.com/
- Website: https://www.ipification.com/
