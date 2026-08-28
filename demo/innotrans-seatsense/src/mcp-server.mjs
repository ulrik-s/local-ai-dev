#!/usr/bin/env node
/**
 * Fake Yggio - an MCP server over stdio.
 *
 * This is what Claude connects to. It pretends to be the Yggio DiMS tenant of
 * a British train operator: SeatSense IoT nodes plus the commercial data
 * needed to answer "what did measuring actual seat occupancy earn us?".
 *
 * Deliberately zero-dependency: the MCP stdio transport is newline-delimited
 * JSON-RPC 2.0, which is short enough to implement directly. Nothing to
 * npm install means nothing to fail on the stand.
 */
import * as db from './dataset.mjs';

const SERVER = { name: 'fake-yggio-seatsense', version: '1.0.0' };
const PROTOCOL_FALLBACK = '2024-11-05';

const str = (description) => ({ type: 'string', description });
const int = (description) => ({ type: 'integer', description });

const TOOLS = [
  {
    name: 'yggio_overview',
    description:
      "Start here. What this Yggio tenant contains: the operator, its routes, the SeatSense device estate, which periods have measured seat occupancy, and the headline year-on-year numbers. Answers 'what data do you have?'.",
    inputSchema: { type: 'object', properties: {} },
    handler: () => db.overview(),
  },
  {
    name: 'compare_years',
    description:
      'The main analysis tool. Compares 2025 (ticket sales only, no sensors) with 2026 (SeatSense live from 1 January) over the same calendar window. Use group_by to break the change down by month, route, demand_class or service. Returns passengers, revenue, average fare, load factors and the year-on-year deltas.',
    inputSchema: {
      type: 'object',
      properties: {
        group_by: { type: 'string', enum: ['total', 'month', 'route', 'service', 'demand_class', 'day_type'], description: "Level of detail. Default 'total'." },
        route_id: str('Optional filter: NBR1, NBR2 or NBR3.'),
        demand_class: { type: 'string', enum: ['peak_core', 'peak_shoulder', 'offpeak', 'evening_peak', 'early_late'], description: 'Optional filter.' },
        service_id: str('Optional filter, e.g. NBR1-0741.'),
        day_type: { type: 'string', enum: ['weekday', 'saturday', 'sunday', 'bank_holiday'], description: 'Optional filter.' },
        from_month: int('Optional first calendar month, 1-12. Defaults to the like-for-like window.'),
        to_month: int('Optional last calendar month, 1-12.'),
      },
    },
    handler: (a) => db.compareYears(a),
  },
  {
    name: 'peak_spreading_report',
    description:
      'The heart of the story: how morning peak demand redistributed after SeatSense-informed pricing. Shows every morning departure before and after - fares, sold load, measured occupancy and ghost seats - plus how much of the peak load moved out of the crush trains into the half-empty shoulder departures.',
    inputSchema: {
      type: 'object',
      properties: {
        route_id: str('Optional: NBR1, NBR2 or NBR3. Omit for the whole network.'),
        month: int('Calendar month 1-12 to compare in both years. Defaults to the latest month with data.'),
      },
    },
    handler: (a) => db.peakSpreadingReport(a),
  },
  {
    name: 'seatsense_snapshot',
    description:
      "What SeatSense actually sees on one train on one day: tickets sold versus seats physically occupied, per coach, plus standing passengers and ghost seats (seats that were paid for and travelled empty). 2026 only - nothing measured seats in 2025. Use this when someone asks about a specific departure or date.",
    inputSchema: {
      type: 'object',
      properties: {
        service_id: str('Required, e.g. NBR1-0741. Use list_services to find ids.'),
        date: str('Required, ISO date between 2026-01-01 and the end of the data, e.g. 2026-06-16.'),
      },
      required: ['service_id', 'date'],
    },
    handler: (a) => db.seatsenseSnapshot(a),
  },
  {
    name: 'seatsense_attribution',
    description:
      'For the commercial question "how much of the revenue growth is really SeatSense?". Splits the revenue change into a price effect and a volume effect, subtracts an assumed underlying market trend, and values the recovered ghost seats. States every assumption it uses.',
    inputSchema: {
      type: 'object',
      properties: {
        assumed_market_growth_pct: { type: 'number', description: 'Counterfactual market growth without SeatSense. Defaults to 1.8. Change it to test the attribution.' },
      },
    },
    handler: (a) => db.seatsenseAttribution(a),
  },
  {
    name: 'pricing_actions',
    description:
      'The fare changes the operator made on 1 January 2026 off the back of SeatSense data, per demand class and per departure, together with the realised fare, passenger and revenue response and the implied elasticity.',
    inputSchema: {
      type: 'object',
      properties: { route_id: str('Optional filter.'), demand_class: str('Optional filter.') },
    },
    handler: (a) => db.pricingActions(a),
  },
  {
    name: 'crowding_and_performance',
    description:
      'The non-financial case: crush departures, standing passengers, crowding complaints, dwell time, PPM punctuality and passengers left behind on the platform, 2025 versus 2026, with the 2026 month-by-month trend.',
    inputSchema: { type: 'object', properties: { month: int('Calendar month 1-12. Defaults to the latest month with data.') } },
    handler: (a) => db.crowdingAndPerformance(a),
  },
  {
    name: 'repricing_candidates',
    description:
      "Forward-looking: which departures to reprice or release seats on next, ranked, with the measured numbers and the rule behind each recommendation. Answers 'what should we do next?'.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: int('How many candidates to return. Default 8.'),
        days: int('Look-back window in days. Default 28.'),
        month: int('Optional: analyse a specific calendar month of 2026 instead of the look-back window.'),
      },
    },
    handler: (a) => db.repricingCandidates(a),
  },
  {
    name: 'list_services',
    description: 'The timetable: every daily departure with its route, demand class, seat count and 2025/2026 fares. Use it to find a service_id.',
    inputSchema: {
      type: 'object',
      properties: {
        route_id: str('Optional: NBR1, NBR2 or NBR3.'),
        demand_class: str('Optional filter.'),
        direction: { type: 'string', enum: ['up', 'down'], description: "Optional: 'up' towards the city, 'down' outbound." },
      },
    },
    handler: (a) => db.listServices(a),
  },
  {
    name: 'service_history',
    description: 'Day-by-day rows for one departure in both years - tickets sold, revenue and, for 2026, the SeatSense measurements. Use it to look at trends or specific dates for a single train.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: str('Required, e.g. NBR2-0748.'),
        from_date: str('Optional ISO date.'),
        to_date: str('Optional ISO date.'),
        limit: int('Rows per year, most recent first in the window. Default 60.'),
      },
      required: ['service_id'],
    },
    handler: (a) => db.serviceHistory(a),
  },
  {
    name: 'yggio_list_iotnodes',
    description: 'The raw Yggio device view: SeatSense IoT nodes, one per instrumented coach, with their context map, install date and status. Use it for questions about the sensor estate rather than the commercial data.',
    inputSchema: {
      type: 'object',
      properties: {
        route_id: str('Optional filter.'),
        unit_id: str('Optional filter, e.g. NBR1-U003.'),
        status: { type: 'string', enum: ['online', 'offline'], description: 'Optional filter.' },
        limit: int('Default 25.'),
        offset: int('Default 0.'),
      },
    },
    handler: (a) => db.listDevices(a),
  },
  {
    name: 'yggio_iotnode_readings',
    description: 'Latest values and the same-day occupancy series for one SeatSense node - seat occupancy per departure for that coach, plus battery and signal strength.',
    inputSchema: {
      type: 'object',
      properties: {
        device_id: str('Required, e.g. iot-nbr1-u003-b.'),
        date: str('Optional ISO date in 2026. Defaults to the latest weekday in the data.'),
      },
      required: ['device_id'],
    },
    handler: (a) => db.deviceReadings(a),
  },
];

const BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

// ---------------------------------------------------------------------------
// JSON-RPC plumbing
// ---------------------------------------------------------------------------

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const result = (id, res) => send({ jsonrpc: '2.0', id, result: res });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

function handle(msg) {
  const { id, method, params = {} } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case 'initialize': {
      const asked = params.protocolVersion;
      return result(id, {
        protocolVersion: /^\d{4}-\d{2}-\d{2}$/.test(asked || '') ? asked : PROTOCOL_FALLBACK,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER,
        instructions:
          'Yggio tenant for Northbank Rail, a fictional British train operator. 2025 has ticket sales only; SeatSense measures actual seat occupancy from 2026-01-01. Call yggio_overview first. All money is GBP. Year-on-year figures are like-for-like over the same calendar window unless asked otherwise.',
      });
    }
    case 'notifications/initialized':
    case 'initialized':
      return;
    case 'ping':
      return result(id, {});
    case 'tools/list':
      return result(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      });
    case 'resources/list':
      return result(id, { resources: [] });
    case 'resources/templates/list':
      return result(id, { resourceTemplates: [] });
    case 'prompts/list':
      return result(id, { prompts: [] });
    case 'tools/call': {
      const tool = BY_NAME[params.name];
      if (!tool) return fail(id, -32602, `Unknown tool "${params.name}". Available: ${TOOLS.map((t) => t.name).join(', ')}`);
      try {
        const payload = tool.handler(params.arguments || {});
        return result(id, {
          content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
          isError: Boolean(payload && payload.error),
        });
      } catch (err) {
        return result(id, {
          content: [{ type: 'text', text: `Tool "${params.name}" failed: ${err.message}` }],
          isError: true,
        });
      }
    }
    default:
      if (!isNotification) fail(id, -32601, `Method not found: ${method}`);
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      fail(null, -32700, 'Parse error');
      continue;
    }
    for (const one of Array.isArray(msg) ? msg : [msg]) handle(one);
  }
});
process.stdin.on('end', () => process.exit(0));
