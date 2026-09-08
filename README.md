# fleet-workbench

Device-fleet workbench demonstrating **MCPMode** with a realistic tool surface — roster,
telemetry, and alert rules over a synthetic IoT fleet.

Sibling to [`hello-workbench`](https://github.com/fathym-deno/hello-workbench) (the minimal
MCP smoke test). Where `hello-workbench` proves a deploy works, this one shows what a
workbench is actually for: a narrow, vetted set of operations an AI may perform against
your fleet.

## What it exposes

Three MCP tools with five methods:

### `devices`

- `ListDevices(site?: string)` — devices with site, type, minutes since last report, and
  battery percentage. `site` defaults to `all`.

### `telemetry`

- `LatestReading(deviceId: string, signal: string)` — most recent reading for a device
  signal. Returns a null `Value` with `StaleMinutes` when the device has gone quiet.

### `alert-rules`

- `CreateHeartbeatRule(deviceId: string, silentMinutes?: number)` — alert when a device
  stops reporting. `silentMinutes` defaults to `30`.
- `CreateThresholdRule(deviceId: string, signal: string, above: number, forMinutes?: number)`
  — alert when a signal holds above a value. `forMinutes` defaults to `5`.
- `ListRules(deviceId?: string)` — rules currently configured. `deviceId` defaults to `all`.

The two rule types exist so the AI has to **choose** rather than just fill in arguments:
a device that went silent needs a heartbeat rule, not a threshold rule.

## Fixture data

The roster is a fixed table, so the same prompt produces the same answer every time — which
makes this repeatable for demos and tests:

| Device | Site | Type | Last seen | Battery |
|---|---|---|---|---|
| `yard-gw-01` | yard | gateway | 1m | 94% |
| `yard-temp-04` | yard | temp-humidity | 437m | 11% |
| `yard-temp-05` | yard | temp-humidity | 437m | 9% |
| `yard-vibe-02` | yard | vibration | 431m | 63% |
| `line-press-03` | line-a | pressure | 2m | 88% |
| `line-oven-01` | line-a | thermocouple | 1m | 77% |

Three yard devices are stale, so *"which yard sensors went quiet, and make sure I hear about
it next time"* has a real answer.

Readings are generated and alert rules are held in memory — they reset when the container
restarts. Swap `LatestReading` for a warm query when you want this pointed at real telemetry.

## OpenX deploy settings

Point the workbench inspector at this repo:

| Field | Value |
|---|---|
| Repo | `https://github.com/ttrichar/fleet-workbench` |
| Ref | `main` (or pin a tag such as `v0.1.2` for an immutable build) |
| Entry | `workbenches/fleet/local.ts` |
| APISlug | `fleet` (or any workspace-unique DNS-safe slug) |
| Modes | Leave `MCP` enabled (default) |

Everything else can stay default.

Once deployed, the container will be reachable at
`{workspace-origin}/oi-api/workbenches/fleet/MCP` — install it in Claude Desktop or Cursor via
`fai mcp install {workspace-origin}/oi-api/workbenches/fleet/MCP --name fleet --auth <jwt>`.

Tools are namespaced by the APISlug, so they are callable as `fleet.ListDevices` and so on.

## Local development

```bash
deno task mcp
```

Runs the workbench in stdio MCP mode locally so you can wire it up to a local MCP client
(Claude Desktop, `fai mcp install`, etc.).
