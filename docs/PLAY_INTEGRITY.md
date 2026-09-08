# Play Integrity backend demo

This demo verifies an Android Play Integrity token on the server at
`POST /api/play-integrity/verify`. The endpoint is disabled unless
`PLAY_INTEGRITY_ENABLED=true`.

## Configuration

Copy the safe examples from `.env.sample` into the deployment environment and
set the package name to the Android application ID:

```dotenv
PLAY_INTEGRITY_ENABLED=false
PLAY_INTEGRITY_PACKAGE_NAME=com.example.demo
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/play-integrity-service-account.json
PLAY_INTEGRITY_REQUIRE_LICENSED_APP=false
```

The Google Cloud project used by the backend must be linked to the matching
application in Google Play Console. Enable the Play Integrity API in that
project, and grant the runtime identity permission to call it (for example,
the least-privilege Play Integrity API user role). The package name in
`PLAY_INTEGRITY_PACKAGE_NAME`, the Play Console app, and the Android build must
match exactly.

For local or secret-mounted deployments, Google Application Default
Credentials (ADC) may read the service-account JSON from
`GOOGLE_APPLICATION_CREDENTIALS`. In a managed deployment, prefer workload
identity or the platform's attached service account so no key file is needed.
Never commit a service-account key, access token, Android integrity token, or
decoded Google response. Do not put any of these values in `.env.sample`, test
fixtures, client code, URLs, or logs.

`PLAY_INTEGRITY_REQUIRE_LICENSED_APP=true` additionally requires the
`LICENSED` app-licensing verdict. Leave it `false` for the basic demo unless
the distribution and licensing requirement has been configured in Play.

## Android provider lifecycle

On Android, prepare the Standard Integrity token provider with the same Google
Cloud project number before requesting a token. Keep the prepared provider in
memory and use it for requests rather than preparing it for every button tap.
Warm the provider during app startup or before the protected action, then
request a token for each action. If the provider reports that it is invalid or
expired, discard it, prepare a new provider, and retry the token request once
after the warm-up succeeds. Follow the Android Play Integrity SDK result and
error callbacks for renewal; do not retry indefinitely or reuse an old token.

## Request hash protocol

The Android client and this backend must hash the same action and payload. The
backend computes:

```text
base64url(SHA-256(UTF-8(action + "\n" + canonicalJson(payload))))
```

`canonicalJson` sorts object keys recursively, preserves array order, and emits
compact JSON without whitespace. Numbers must be finite; unsupported values
and circular structures are rejected. Put this hash in the Android Standard
Integrity request as the request hash. Send the same `action` and `payload` to
the backend, byte-for-byte in meaning, so the recomputed hash matches.

## Verify the demo endpoint

Use an integrity token obtained from the Android app. This is the only
placeholder request shown here; replace the token locally and do not paste a
real token into source control or documentation:

```bash
curl --request POST "http://localhost:3000/api/play-integrity/verify" --header "Content-Type: application/json" --data '{"integrityToken":"<token-from-android>","action":"demo.protected-action.v1","payload":{"transactionId":"demo-123","amount":100}}'
```

The normalized response contains only:

```json
{
  "requestId": "request-id",
  "decision": "allow",
  "reasonCodes": [],
  "requestHashMatched": true,
  "verdict": {
    "appRecognition": "PLAY_RECOGNIZED",
    "deviceIntegrity": ["MEETS_DEVICE_INTEGRITY"],
    "appLicensing": "LICENSED"
  }
}
```

An allow response is HTTP 200. A policy denial is HTTP 403 and includes safe
reason codes such as `REQUEST_HASH_MISMATCH`, `APP_NOT_RECOGNIZED`,
`DEVICE_INTEGRITY_NOT_MET`, or `APP_NOT_LICENSED`. Invalid input returns 400;
Google credential, network, or timeout unavailability returns 503. The API
does not return the submitted token, bearer credential, decoded
`tokenPayloadExternal`, or raw Google response.

Request-level operational logs should be limited to the request ID, decision,
reason codes, and duration. Never log request bodies, integrity tokens,
credentials, or decoded verdict payloads.

## Android verification checklist

Run this checklist only with non-production credentials and a Play-installed
test build. It is intentionally recorded as a manual procedure; it has not
been run in this repository without Android credentials and a linked Play
application.

- [ ] Link the Google Cloud project to the Play Console application and enable
      the Play Integrity API.
- [ ] Configure ADC or workload identity for the backend without committing a
      key file.
- [ ] Confirm the Android package name equals `PLAY_INTEGRITY_PACKAGE_NAME`.
- [ ] Warm the Android provider and renew it when the SDK reports invalid or
      expired state.
- [ ] Submit a token whose request hash matches the documented action and
      payload; confirm HTTP 200 with `decision: "allow"`.
- [ ] Retain that exact token, change only `payload.amount` in the backend POST
      body, and reuse the retained token; confirm HTTP 403 with
      `REQUEST_HASH_MISMATCH`.
- [ ] Confirm logs contain only request ID, decision, reason codes, and
      duration, with no token, credential, request body, or decoded response.
