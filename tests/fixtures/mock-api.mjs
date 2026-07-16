import http from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 8100);
const state = {
  pushCalls: 0,
  pullCalls: 0,
  statusCalls: 0,
  failPushOnce: false,
  failPullOnce: false,
  lastPushedMutations: [],
  records: {},
  mutations: {},
  cursor: 0
};

function json(response, status, body, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, private",
    "Access-Control-Allow-Origin": "http://127.0.0.1:3100",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, X-CSRF-Token",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    ...headers
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => resolve(body ? JSON.parse(body) : null));
  });
}

function accountFromCookie(cookieHeader = "") {
  const match = cookieHeader.match(/project-suiii-session=([^;]+)/);
  const raw = match ? decodeURIComponent(match[1]) : "";
  return raw.includes("account-b") ? "account-b" : "account-a";
}

function profileFor(accountId) {
  return accountId === "account-b"
    ? { id: "account-b", email: "other@example.test", full_name: "Other Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false }
    : { id: "account-a", email: "athlete@example.test", full_name: "Test Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false };
}

function recordPayload(mutation) {
  if (mutation.payload && typeof mutation.payload.payload === "object") return mutation.payload.payload;
  return mutation.payload ?? {};
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (request.method === "OPTIONS") return json(response, 204, {});
  if (url.pathname === "/api/v1/__test/state") return json(response, 200, state);
  if (url.pathname === "/api/v1/__test/reset") {
    state.pushCalls = 0;
    state.pullCalls = 0;
    state.statusCalls = 0;
    state.failPushOnce = url.searchParams.get("failPushOnce") === "1";
    state.failPullOnce = url.searchParams.get("failPullOnce") === "1";
    state.lastPushedMutations = [];
    state.records = {};
    state.mutations = {};
    state.cursor = 0;
    return json(response, 200, state);
  }
  if (url.pathname === "/api/v1/auth/me") {
    if (!request.headers.cookie) return json(response, 401, { detail: "Unauthenticated" });
    return json(response, 200, profileFor(accountFromCookie(request.headers.cookie)));
  }
  if (url.pathname === "/api/v1/auth/logout") return json(response, 204, {});
  if (url.pathname === "/api/v1/profile") {
    const account = profileFor(accountFromCookie(request.headers.cookie));
    return json(response, 200, { id: `${account.id}-profile`, email: account.email, full_name: account.full_name, timezone: "Asia/Dhaka", profile_configured: true, programme_start_date: "2026-07-14", version: 1 });
  }
  if (url.pathname === "/api/v1/sync/status") {
    state.statusCalls += 1;
    return json(response, 200, { last_sync_at: "2026-07-15T12:00:00.000Z", pending_count: 0, failed_count: 0, conflicts_count: 0, device_id: "device-local", device_name: "This device" });
  }
  if (url.pathname === "/api/v1/sync/push") {
    state.pushCalls += 1;
    if (state.failPushOnce) {
      state.failPushOnce = false;
      return json(response, 503, { detail: "Temporary push failure" });
    }
    const accountId = accountFromCookie(request.headers.cookie);
    state.records[accountId] = state.records[accountId] ?? {};
    state.mutations[accountId] = state.mutations[accountId] ?? {};
    const body = await readBody(request);
    const mutations = Array.isArray(body?.mutations) ? body.mutations : [];
    state.lastPushedMutations = mutations;
    const results = mutations.map((mutation) => {
      if (state.mutations[accountId][mutation.client_mutation_id]) {
        return { mutation_id: mutation.client_mutation_id, entity_type: mutation.entity_type, entity_id: mutation.entity_id, status: "duplicate", server_version: state.records[accountId][`${mutation.entity_type}:${mutation.entity_id}`]?.server_version ?? 1, payload: {} };
      }
      state.mutations[accountId][mutation.client_mutation_id] = true;
      const key = `${mutation.entity_type}:${mutation.entity_id}`;
      const version = (state.records[accountId][key]?.server_version ?? 0) + 1;
      state.cursor += 1;
      state.records[accountId][key] = {
        sequence: state.cursor,
        entity_type: mutation.entity_type,
        entity_id: mutation.entity_id,
        client_record_id: mutation.payload?.client_record_id ?? mutation.entity_id,
        server_version: version,
        server_updated_at: new Date().toISOString(),
        deleted_at: mutation.mutation_type === "delete" ? new Date().toISOString() : null,
        payload: recordPayload(mutation)
      };
      return { mutation_id: mutation.client_mutation_id, entity_type: mutation.entity_type, entity_id: mutation.entity_id, status: "applied", server_version: version, payload: {} };
    });
    return json(response, 200, { results, server_time: new Date().toISOString() });
  }
  if (url.pathname === "/api/v1/sync/pull") {
    state.pullCalls += 1;
    const accountId = accountFromCookie(request.headers.cookie);
    if (state.failPullOnce) {
      state.failPullOnce = false;
      return json(response, 503, { detail: "Temporary pull failure" });
    }
    const cursor = Number(url.searchParams.get("cursor") ?? 0);
    const records = Object.values(state.records[accountId] ?? {}).filter((record) => !cursor || record.sequence > cursor);
    return json(response, 200, { records, next_cursor: String(state.cursor), has_more: false, server_time: new Date().toISOString() });
  }
  return json(response, 404, { detail: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Project SUIII API listening on ${port}`);
});
