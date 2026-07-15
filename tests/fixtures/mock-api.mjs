import http from "node:http";

const port = Number(process.env.MOCK_API_PORT ?? 8100);
const state = {
  pushCalls: 0,
  pullCalls: 0,
  statusCalls: 0,
  failPullOnce: false
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

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  if (request.method === "OPTIONS") return json(response, 204, {});
  if (url.pathname === "/api/v1/__test/state") return json(response, 200, state);
  if (url.pathname === "/api/v1/__test/reset") {
    state.pushCalls = 0;
    state.pullCalls = 0;
    state.statusCalls = 0;
    state.failPullOnce = url.searchParams.get("failPullOnce") === "1";
    return json(response, 200, state);
  }
  if (url.pathname === "/api/v1/auth/me") {
    if (!request.headers.cookie) return json(response, 401, { detail: "Unauthenticated" });
    return json(response, 200, { id: "account-a", email: "athlete@example.test", full_name: "Test Athlete", timezone: "Asia/Dhaka", is_active: true, is_admin: false });
  }
  if (url.pathname === "/api/v1/auth/logout") return json(response, 204, {});
  if (url.pathname === "/api/v1/profile") {
    return json(response, 200, { id: "profile-a", email: "athlete@example.test", full_name: "Test Athlete", timezone: "Asia/Dhaka", profile_configured: true, programme_start_date: "2026-07-14", version: 1 });
  }
  if (url.pathname === "/api/v1/sync/status") {
    state.statusCalls += 1;
    return json(response, 200, { last_sync_at: "2026-07-15T12:00:00.000Z", pending_count: 0, failed_count: 0, conflicts_count: 0, device_id: "device-local", device_name: "This device" });
  }
  if (url.pathname === "/api/v1/sync/push") {
    state.pushCalls += 1;
    const body = await readBody(request);
    const mutations = Array.isArray(body?.mutations) ? body.mutations : [];
    return json(response, 200, { results: mutations.map((mutation) => ({ client_mutation_id: mutation.client_mutation_id, status: "applied", server_version: 1 })) });
  }
  if (url.pathname === "/api/v1/sync/pull") {
    state.pullCalls += 1;
    if (state.failPullOnce) {
      state.failPullOnce = false;
      return json(response, 503, { detail: "Temporary pull failure" });
    }
    return json(response, 200, { records: [] });
  }
  return json(response, 404, { detail: "Not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Mock Project SUIII API listening on ${port}`);
});
