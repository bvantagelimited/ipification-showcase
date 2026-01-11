# Quick Start Guide

This guide will help you get the IPification Showcase application up and running quickly.

## Prerequisites Checklist

- [ ] Node.js >= 22.x installed
- [ ] npm installed
- [ ] IPification account credentials
- [ ] Access to IPification dashboard

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Application

```bash
cp config/default.json.sample config/default.json
```

For a full field reference, see [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md).

Edit `config/default.json` and add at least one client configuration:

```json
{
  "realm": "ipification",
  "auth_server_url": "https://api.stage.ipification.com/auth",
  "app_logo_url": "/images/logo/vil.svg",
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

**Configuration Options**:

- `app_logo_url`: URL to your application logo image. Can be:
  - Relative path: `/images/logo/vil.svg` (for local images)
  - Absolute URL: `https://example.com/logo.png` (for external images)
  - If not provided, the application name will be displayed as text instead
  - See [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md) for all fields

### Step 3: Start the Server

```bash
npm start
```

### Step 4: Access the Application

1. Find your machine's IP address:

   - **macOS/Linux**: `ifconfig` or `ip addr`
   - **Windows**: `ipconfig`

2. Open browser and navigate to:

   ```
   http://<your-ip-address>:3000
   ```

3. Select "Stage" environment from dropdown

4. Click "IP" button in PNV tab to test authentication

## Testing Different Flows

### Phone Number Verification (PNV)

1. Go to **PNV** tab
2. Enter phone number (optional for some flows)
3. Click desired button:
   - **IP**: Carrier-based verification
   - **IP+**: Enhanced verification with mobile ID
   - **IM**: Instant messaging verification
   - **SIM**: SIM card verification

### Quick Access Login

1. Go to **Login** tab
2. Click desired login method:
   - **IP**: Carrier-based login
   - **IP+**: Enhanced login
   - **IM**: Instant messaging login
   - **SIM**: SIM card login

### Identity Services

1. Go to **Identity** tab
2. For **Anonymous Identity**: Click button directly
3. For **KYC Data**: Enter phone number, then click "KYC"

## Common Issues

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:

```bash
PORT=3001 npm start
```

Then access: `http://<your-ip>:3001`

### Configuration Error

**Error**: `Client not found`

**Solution**:

- Verify `config/default.json` exists
- Check that `user_flow` matches configuration
- Ensure client credentials are correct
- Reference [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md) for required fields

### Cannot Access from Mobile Device

**Issue**: Mobile device cannot reach the application

**Solutions**:

1. Ensure desktop and mobile are on same network
2. Check firewall settings
3. Use machine's local IP (not `localhost` or `127.0.0.1`)
4. Verify port is not blocked

### Authentication Fails

**Issue**: Authentication redirects to error page

**Solutions**:

1. Verify `redirect_uri` in IPification dashboard matches:
   ```
   http://<your-ip>:3000/auth/callback/<user_flow>
   ```
2. Check client_id and client_secret are correct
3. Verify scope permissions match client configuration
4. Ensure phone number format is E.164 (e.g., `+1234567890`)

## Development Mode

For development with auto-reload:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

## Environment Variables

Create a `.env` file for custom configuration:

```bash
PORT=3000
NODE_ENV=development
```

Supported `NODE_ENV` values: `development`, `stage`, `live`, `live_id`.

## Next Steps

- Read [README.md](../README.md) for detailed documentation
- Check [API.md](API.md) for API endpoint details
- Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Explore different user flows in the application

## Getting Help

- **IPification Developer Portal**: https://developer.ipification.com/
- **IPification Website**: https://www.ipification.com/
- Check application logs for detailed error messages
