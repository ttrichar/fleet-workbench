/**
 * Fleet Workbench — demo Entry point.
 *
 * The roster is a fixed table, so the demo is deterministic and every
 * take produces the same three stale devices. Rules are held in memory
 * and reset when the container restarts. Swap LatestReading for a warm
 * query when you want this pointed at real telemetry.
 */
import { MCPMode, Workbench } from '@fathym/fai/workbenches';
import { Tool } from '@fathym/fai/tools';
import { z } from 'zod';

const DEVICES = [
  { Id: 'yard-gw-01', Site: 'yard', Type: 'gateway', LastSeenMinutes: 1, BatteryPct: 94 },
  { Id: 'yard-temp-04', Site: 'yard', Type: 'temp-humidity', LastSeenMinutes: 437, BatteryPct: 11 },
  { Id: 'yard-temp-05', Site: 'yard', Type: 'temp-humidity', LastSeenMinutes: 437, BatteryPct: 9 },
  { Id: 'yard-vibe-02', Site: 'yard', Type: 'vibration', LastSeenMinutes: 431, BatteryPct: 63 },
  { Id: 'line-press-03', Site: 'line-a', Type: 'pressure', LastSeenMinutes: 2, BatteryPct: 88 },
  { Id: 'line-oven-01', Site: 'line-a', Type: 'thermocouple', LastSeenMinutes: 1, BatteryPct: 77 },
];

type Rule = {
  Id: string;
  Kind: 'heartbeat' | 'threshold';
  Device: string;
  Detail: string;
};

const rules: Rule[] = [];

const addRule = (kind: Rule['Kind'], device: string, detail: string) => {
  const rule: Rule = {
    Id: `rule-${rules.length + 1}`,
    Kind: kind,
    Device: device,
    Detail: detail,
  };
  rules.push(rule);
  return Promise.resolve(JSON.stringify(rule));
};

const DevicesTool = Tool(
  'devices',
  'The device fleet - what is deployed, where, and when each unit last reported.',
)
  .Handle(z.object({
    ListDevices: z.function({
      input: z.tuple([
        z.string().default('all').describe("Site to filter by, or 'all'."),
      ]),
      output: z.promise(z.string()),
    }).describe(
      'List devices with site, type, minutes since last report, and battery percentage.',
    ),
  }))
  .Execute((_ctx) => ({
    ListDevices: (site: string) =>
      Promise.resolve(JSON.stringify(
        site === 'all' ? DEVICES : DEVICES.filter((d) => d.Site === site),
      )),
  }));

const TelemetryTool = Tool(
  'telemetry',
  'Latest signal readings from a device.',
)
  .Handle(z.object({
    LatestReading: z.function({
      input: z.tuple([
        z.string().describe('Device id, e.g. line-press-03.'),
        z.string().describe('Signal name, e.g. pressure_psi.'),
      ]),
      output: z.promise(z.string()),
    }).describe('Return the most recent reading for a device signal.'),
  }))
  .Execute((_ctx) => ({
    LatestReading: (device: string, signal: string) => {
      const found = DEVICES.find((d) => d.Id === device);

      if (!found) {
        return Promise.resolve(
          JSON.stringify({ Error: `Unknown device: ${device}` }),
        );
      }

      return Promise.resolve(JSON.stringify({
        Device: device,
        Signal: signal,
        Value: found.LastSeenMinutes > 60
          ? null
          : Number((120 + Math.random() * 40).toFixed(1)),
        StaleMinutes: found.LastSeenMinutes,
      }));
    },
  }));

const AlertRulesTool = Tool(
  'alert-rules',
  'Alert rules. Heartbeat rules fire on silence; threshold rules fire on a value.',
)
  .Handle(z.object({
    CreateHeartbeatRule: z.function({
      input: z.tuple([
        z.string().describe('Device id the rule watches.'),
        z.number().default(30).describe(
          'Alert if the device is silent this many minutes.',
        ),
      ]),
      output: z.promise(z.string()),
    }).describe(
      'Alert when a device stops reporting for longer than the given window.',
    ),
    CreateThresholdRule: z.function({
      input: z.tuple([
        z.string().describe('Device id the rule watches.'),
        z.string().describe('Signal name, e.g. pressure_psi.'),
        z.number().describe('Alert when the signal holds above this value.'),
        z.number().default(5).describe('Minutes it must hold before alerting.'),
      ]),
      output: z.promise(z.string()),
    }).describe('Alert when a device signal holds above a threshold.'),
    ListRules: z.function({
      input: z.tuple([
        z.string().default('all').describe("Device id to filter by, or 'all'."),
      ]),
      output: z.promise(z.string()),
    }).describe('List the alert rules currently configured.'),
  }))
  .Execute((_ctx) => ({
    CreateHeartbeatRule: (device: string, silentMinutes: number) =>
      addRule('heartbeat', device, `silent for ${silentMinutes}m`),
    CreateThresholdRule: (
      device: string,
      signal: string,
      above: number,
      forMinutes: number,
    ) => addRule('threshold', device, `${signal} above ${above} for ${forMinutes}m`),
    ListRules: (device: string) =>
      Promise.resolve(JSON.stringify(
        device === 'all' ? rules : rules.filter((r) => r.Device === device),
      )),
  }));

export default Workbench(
  'fleet',
  'Device fleet operations - roster, telemetry, and alert rules.',
)
  .Tools({
    Devices: DevicesTool,
    Telemetry: TelemetryTool,
    AlertRules: AlertRulesTool,
  })
  .Modes({ MCP: MCPMode() });
