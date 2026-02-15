# home-mcp

This is an MCP server for controlling home appliances via the Nature Remo Cloud API.  
It runs on `Hono` + `Cloudflare Workers` and exposes `/mcp` using Streamable HTTP.

## Implemented MCP Tools

- `remo_list_devices`: List Nature Remo devices available to this token
- `remo_get_room_temperature`: Get room temperature/humidity for a specific Remo device (`deviceId` required)
- `remo_list_appliances`: List appliances in a specific Remo device (`deviceId` required)
- `remo_send_signal`: Send an infrared signal by `signalId` in a specific device (`deviceId` required)
- `remo_send_signal_by_name`: Send an infrared signal by exact appliance name + exact signal name in a specific device (`deviceId` required)
- `remo_control_aircon`: Update air conditioner settings in a specific device (`deviceId` required)
- `remo_control_tv`: Send TV button commands in a specific device (`deviceId` required)
- `remo_control_light`: Send light button commands in a specific device (`deviceId` required)

## Prerequisites

1. Create a Personal Access Token from the [Nature Developer Portal](https://developer.nature.global)
2. Prepare a Cloudflare account with `wrangler`

## Setup

```bash
pnpm install
```

Set required secrets:

```bash
pnpm wrangler secret put NATURE_REMO_ACCESS_TOKEN
```

Optionally set a token to protect the MCP endpoint:

```bash
pnpm wrangler secret put MCP_BEARER_TOKEN
```

Tip: You can generate a strong token with:

```bash
openssl rand -base64 32
```

If you use local `.dev.vars`, copy `.dev.vars.example` and fill in values.

Generate runtime types:

```bash
pnpm typegen
```

## Run Locally

```bash
pnpm dev
```

## Test

```bash
pnpm test
pnpm test:watch
```

## Deploy

```bash
pnpm deploy
```

## MCP Client Configuration Example

For a client that supports Streamable HTTP, configure:

- URL: `https://<your-worker-domain>/mcp`
- Header (optional): `Authorization: Bearer <MCP_BEARER_TOKEN>`

Example:

```json
{
  "mcpServers": {
    "nature-remo": {
      "type": "http",
      "url": "https://your-worker-domain/mcp",
      "headers": {
        "Authorization": "Bearer your_mcp_bearer_token"
      }
    }
  }
}
```

## Notes

- `button` values for `TV` / `light` depend on the appliance model.
- Valid `aircon` values (for example `operation_mode`, `air_volume`) are device-specific.
- `remo_get_room_temperature` uses `newest_events.te` as room temperature and `newest_events.hu` as humidity.
- Recommended token scopes (personal developer token): `basic`, `sendir`
- Optional read scope for ECHONET Lite data: `echonetlite.*.read`
- It is safer to call `remo_list_devices` and `remo_list_appliances` first, then use confirmed IDs.
