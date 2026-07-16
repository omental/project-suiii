import { createWriteStream, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const backendDir = resolve(root, "backend");
const isWindows = process.platform === "win32";
const python = resolve(backendDir, ".venv", "Scripts", isWindows ? "python.exe" : "python");
const dbName = process.env.REAL_SYNC_DB_NAME ?? "suii_real_sync_e2e";
const dbAdminUrl = process.env.REAL_SYNC_ADMIN_DATABASE_URL ?? "postgresql://postgres:postgres123@127.0.0.1:5432/postgres";
const databaseUrl = process.env.REAL_SYNC_DATABASE_URL ?? `postgresql+asyncpg://postgres:postgres123@127.0.0.1:5432/${dbName}`;
const backendUrl = "http://127.0.0.1:8210";
const frontendUrl = "http://127.0.0.1:3200";
const apiBaseUrl = `${backendUrl}/api/v1`;
const cli = parseArgs(process.argv.slice(2));
const baseLogsDir = resolve(root, ".real-sync-logs");
const logsDir = cli.preserveLogs ? resolve(baseLogsDir, new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")) : baseLogsDir;
const preserveDb = cli.preserveDb || process.env.REAL_SYNC_PRESERVE_DB === "1";
const smokeOnly = cli.smokeOnly;
const orchestrationTimeoutMs = 12 * 60_000;
const playwrightTimeoutMs = 8 * 60_000;
const cleanupTimeoutMs = 15_000;
const npmCli = process.env.npm_execpath && existsSync(process.env.npm_execpath)
  ? process.env.npm_execpath
  : isWindows
    ? resolve(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")
    : "npm";

mkdirSync(logsDir, { recursive: true });

const children = new Set();
let shuttingDown = false;
let exitCode = 0;
let currentStage = "initializing";
let watchdog = null;

function parseArgs(args) {
  const parsed = {
    grep: null,
    headed: false,
    debug: false,
    preserveDb: false,
    preserveLogs: false,
    smokeOnly: false
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--grep") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--grep requires a pattern argument");
      parsed.grep = value;
      index += 1;
    } else if (arg === "--headed") {
      parsed.headed = true;
    } else if (arg === "--debug") {
      parsed.debug = true;
    } else if (arg === "--preserve-db") {
      parsed.preserveDb = true;
    } else if (arg === "--preserve-logs") {
      parsed.preserveLogs = true;
    } else if (arg === "--smoke") {
      parsed.smokeOnly = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function playwrightArgs() {
  const args = ["exec", "--", "playwright", "test", "--config", "playwright.real-sync.config.ts"];
  if (cli.grep) args.push("--grep", cli.grep);
  if (cli.headed) args.push("--headed");
  if (cli.debug) args.push("--debug");
  return args;
}

function log(message) {
  process.stdout.write(`[real-sync ${new Date().toISOString()}] ${message}\n`);
}

function warn(message) {
  process.stderr.write(`[real-sync ${new Date().toISOString()}] ${message}\n`);
}

function setStage(stage) {
  currentStage = stage;
  log(`${stage} started`);
}

function completeStage(stage = currentStage) {
  log(`${stage} completed`);
}

function tail(file, lines = 100) {
  try {
    return readFileSync(file, "utf8").split(/\r?\n/).slice(-lines).join("\n");
  } catch {
    return "";
  }
}

function spawnLogged(name, command, args, options = {}) {
  mkdirSync(logsDir, { recursive: true });
  const stdoutPath = resolve(logsDir, `${name}.stdout.log`);
  const stderrPath = resolve(logsDir, `${name}.stderr.log`);
  const stdout = createWriteStream(stdoutPath, { flags: "w" });
  const stderr = createWriteStream(stderrPath, { flags: "w" });
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: options.env ?? process.env,
    shell: false,
    detached: !isWindows,
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.pipe(stdout);
  child.stderr.pipe(stderr);
  child.stdoutPath = stdoutPath;
  child.stderrPath = stderrPath;
  child.processName = name;
  child.exitCodeSeen = null;
  child.exitSignalSeen = null;
  children.add(child);
  log(`${name} spawned pid=${child.pid ?? "unknown"}`);
  child.once("exit", (code, signal) => {
    child.exitCodeSeen = code;
    child.exitSignalSeen = signal;
    children.delete(child);
    stdout.end();
    stderr.end();
    if (!shuttingDown && options.required !== false) {
      warn(`${name} exited early: pid=${child.pid ?? "unknown"} code=${code} signal=${signal}`);
      printProcessDiagnostics(child);
      exitCode = code ?? 1;
    }
  });
  child.once("error", (error) => {
    child.spawnError = error;
    warn(`${name} spawn failed: ${error.message}`);
  });
  return child;
}

function npmArgs(args) {
  return isWindows ? [npmCli, ...args] : args;
}

function npmCommand() {
  return isWindows ? process.execPath : npmCli;
}

function timeoutError(name, timeoutMs) {
  const error = new Error(`${name} timed out after ${timeoutMs}ms while stage="${currentStage}"`);
  error.name = "RealSyncTimeoutError";
  return error;
}

function runCommand(name, command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    log(`${name} started`);
    const child = spawnLogged(name, command, args, { ...options, required: false });
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          warn(`${name} timed out: stage="${currentStage}" pid=${child.pid ?? "unknown"} code=${child.exitCodeSeen} signal=${child.exitSignalSeen}`);
          printProcessDiagnostics(child);
          reject(timeoutError(name, options.timeoutMs));
          void killTree(child);
        }, options.timeoutMs)
      : null;
    child.once("exit", (code, signal) => {
      if (timeout) clearTimeout(timeout);
      if (code === 0) {
        log(`${name} completed: pid=${child.pid ?? "unknown"} code=${code}`);
        resolvePromise();
      }
      else {
        printProcessDiagnostics(child);
        reject(new Error(`${name} failed: code=${code} signal=${signal}`));
      }
    });
    child.once("error", reject);
  });
}

function runCommandWithExit(name, command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    log(`${name} started`);
    const child = spawnLogged(name, command, args, { ...options, required: false });
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          warn(`${name} timed out: stage="${currentStage}" pid=${child.pid ?? "unknown"} code=${child.exitCodeSeen} signal=${child.exitSignalSeen}`);
          printProcessDiagnostics(child);
          void killTree(child);
          reject(timeoutError(name, options.timeoutMs));
        }, options.timeoutMs)
      : null;
    child.once("exit", (code, signal) => {
      if (timeout) clearTimeout(timeout);
      const resolved = code ?? 1;
      log(`${name} exited: pid=${child.pid ?? "unknown"} code=${resolved} signal=${signal}`);
      resolvePromise(resolved);
    });
    child.once("error", reject);
  });
}

async function pythonCode(name, code, timeoutMs = 60_000) {
  await runCommand(name, python, ["-c", code], {
    cwd: root,
    timeoutMs,
    env: process.env
  });
}

async function recreateDatabase() {
  const adminUrl = dbAdminUrl.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
  const name = dbName.replaceAll("'", "\\'");
  await pythonCode(
    "database-setup",
    [
      "import asyncio, asyncpg",
      "async def main():",
      `    admin=await asyncpg.connect('${adminUrl}')`,
      `    db='${name}'`,
      "    exists=await admin.fetchval('select 1 from pg_database where datname=$1', db)",
      "    if exists:",
      "        await admin.execute('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1', db)",
      "        await admin.execute(f'drop database {db}')",
      "    await admin.execute(f'create database {db}')",
      "    await admin.close()",
      "asyncio.run(main())"
    ].join("\n")
  );
}

async function dropDatabase() {
  if (preserveDb) {
    log(`preserving database ${dbName}`);
    return;
  }
  const adminUrl = dbAdminUrl.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
  const name = dbName.replaceAll("'", "\\'");
  await pythonCode(
    "database-drop",
    [
      "import asyncio, asyncpg",
      "async def main():",
      `    admin=await asyncpg.connect('${adminUrl}')`,
      `    db='${name}'`,
      "    await admin.execute('select pg_terminate_backend(pid) from pg_stat_activity where datname=$1', db)",
      "    exists=await admin.fetchval('select 1 from pg_database where datname=$1', db)",
      "    if exists:",
      "        await admin.execute(f'drop database {db}')",
      "    await admin.close()",
      "asyncio.run(main())"
    ].join("\n"),
    30_000
  );
}

function serverEnv() {
  return {
    ...process.env,
    PROJECT_SUIII_ENV: "test",
    DATABASE_URL: databaseUrl,
    ALLOWED_ORIGINS: `${frontendUrl},http://localhost:3200`,
    COOKIE_SECURE: "false",
    SESSION_COOKIE_NAME: "suiii_real_sync_session",
    CSRF_COOKIE_NAME: "suiii_real_sync_csrf",
    NEXT_PUBLIC_API_BASE_URL: apiBaseUrl,
    API_INTERNAL_BASE_URL: apiBaseUrl,
    NEXT_PUBLIC_SYNC_PULL_LIMIT: process.env.REAL_SYNC_PULL_LIMIT ?? "2"
  };
}

async function waitForUrl(name, url, timeoutMs) {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      last = `${response.status} ${await response.text().catch(() => "")}`;
      if (response.ok) return response;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }
  const error = timeoutError(`${name} readiness`, timeoutMs);
  error.lastResponse = last;
  error.url = url;
  throw error;
}

function assertPortFree(port) {
  return new Promise((resolvePromise, reject) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      reject(new Error(`Port ${port} is still accepting connections`));
    });
    socket.once("error", () => resolvePromise());
    socket.setTimeout(2_000, () => {
      socket.destroy();
      resolvePromise();
    });
  });
}

async function killTree(child) {
  if (!child?.pid) return;
  log(`terminating ${child.processName ?? "child"} pid=${child.pid}`);
  if (isWindows) {
    await new Promise((resolvePromise) => {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { shell: false, stdio: "ignore" });
      const timer = setTimeout(resolvePromise, 10_000);
      killer.once("exit", () => {
        clearTimeout(timer);
        resolvePromise();
      });
    });
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {}
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10_000));
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {}
  }
}

function printProcessDiagnostics(child) {
  warn(`${child.processName} diagnostics: pid=${child.pid ?? "unknown"} code=${child.exitCodeSeen} signal=${child.exitSignalSeen}`);
  process.stderr.write(`\n[real-sync] ${child.processName} stdout tail:\n${tail(child.stdoutPath)}\n`);
  process.stderr.write(`\n[real-sync] ${child.processName} stderr tail:\n${tail(child.stderrPath)}\n`);
}

function printAllChildDiagnostics() {
  for (const child of children) printProcessDiagnostics(child);
}

async function cleanup() {
  if (shuttingDown) return;
  shuttingDown = true;
  log("cleanup started");
  for (const child of [...children].reverse()) await killTree(child);
  try {
    await dropDatabase();
  } catch (error) {
    warn(`database cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    exitCode ||= 1;
  }
  try {
    await assertPortFree(8210);
    log("port 8210 verified free");
    await assertPortFree(3200);
    log("port 3200 verified free");
  } catch (error) {
    warn(error instanceof Error ? error.message : String(error));
    exitCode ||= 1;
  }
  log("cleanup completed");
}

async function cleanupWithTimeout() {
  let timedOut = false;
  await Promise.race([
    cleanup(),
    new Promise((resolvePromise) => setTimeout(() => {
      timedOut = true;
      warn(`cleanup timed out after ${cleanupTimeoutMs}ms while stage="${currentStage}"`);
      resolvePromise();
    }, cleanupTimeoutMs))
  ]);
  if (timedOut) exitCode ||= 1;
}

async function main() {
  log(`logs: ${logsDir}`);
  setStage("database recreation");
  await recreateDatabase();
  completeStage();
  setStage("Alembic upgrade");
  await runCommand("alembic-upgrade", python, ["-m", "alembic", "upgrade", "head"], {
    cwd: backendDir,
    timeoutMs: 60_000,
    env: serverEnv()
  });
  completeStage();
  setStage("seed user sync-a@example.com");
  await runCommand("seed-user-a", python, ["-m", "app.scripts.create_user", "--email", "sync-a@example.com", "--name", "Sync User A", "--password", "SyncReal123!"], {
    cwd: backendDir,
    timeoutMs: 30_000,
    env: serverEnv()
  });
  completeStage();
  setStage("seed user sync-b@example.com");
  await runCommand("seed-user-b", python, ["-m", "app.scripts.create_user", "--email", "sync-b@example.com", "--name", "Sync User B", "--password", "SyncReal123!"], {
    cwd: backendDir,
    timeoutMs: 30_000,
    env: serverEnv()
  });
  completeStage();
  setStage("Next.js build");
  await runCommand("next-build", npmCommand(), npmArgs(["exec", "--", "next", "build"]), {
    cwd: root,
    timeoutMs: 120_000,
    env: serverEnv()
  });
  completeStage();

  setStage("FastAPI spawn");
  const backend = spawnLogged("fastapi", python, ["-m", "uvicorn", "app.main:create_app", "--factory", "--host", "127.0.0.1", "--port", "8210"], {
    cwd: backendDir,
    env: serverEnv()
  });
  completeStage("FastAPI spawn");
  setStage("Next.js server spawn");
  const frontend = spawnLogged("next", npmCommand(), npmArgs(["exec", "--", "next", "start", "--hostname", "127.0.0.1", "--port", "3200"]), {
    cwd: root,
    env: serverEnv()
  });
  completeStage("Next.js server spawn");

  try {
    setStage("FastAPI readiness");
    await waitForUrl("FastAPI", `${apiBaseUrl}/ready`, 60_000);
    log("FastAPI ready");
    completeStage();
    setStage("Next.js readiness");
    await waitForUrl("Next.js", `${frontendUrl}/sign-in`, 120_000);
    log("Next.js ready");
    completeStage();
  } catch (error) {
    warn(`startup failed during ${currentStage}: ${error instanceof Error ? error.message : String(error)}`);
    if (error?.lastResponse) warn(`${currentStage} last response: ${error.lastResponse}`);
    printProcessDiagnostics(backend);
    printProcessDiagnostics(frontend);
    throw error;
  }

  if (smokeOnly) {
    log("smoke readiness passed");
    return;
  }

  setStage("Playwright real-sync suite");
  exitCode = await runCommandWithExit("playwright-real-sync", npmCommand(), npmArgs(playwrightArgs()), {
    cwd: root,
    timeoutMs: playwrightTimeoutMs,
    env: {
      ...serverEnv(),
      REAL_SYNC_DATABASE_URL: databaseUrl,
      REAL_SYNC_BACKEND_URL: backendUrl,
      REAL_SYNC_FRONTEND_URL: frontendUrl
    }
  });
  completeStage();
}

process.once("SIGINT", async () => {
  exitCode = 130;
  warn(`SIGINT received during ${currentStage}`);
  printAllChildDiagnostics();
  await cleanupWithTimeout();
  process.exit(exitCode);
});
process.once("SIGTERM", async () => {
  exitCode = 143;
  warn(`SIGTERM received during ${currentStage}`);
  printAllChildDiagnostics();
  await cleanupWithTimeout();
  process.exit(exitCode);
});
process.once("uncaughtException", async (error) => {
  warn(`uncaught exception during ${currentStage}: ${error.stack ?? error.message}`);
  exitCode = 1;
  printAllChildDiagnostics();
  await cleanupWithTimeout();
  process.exit(exitCode);
});
process.once("unhandledRejection", async (reason) => {
  warn(`unhandled rejection during ${currentStage}: ${reason instanceof Error ? reason.stack : String(reason)}`);
  exitCode = 1;
  printAllChildDiagnostics();
  await cleanupWithTimeout();
  process.exit(exitCode);
});

try {
  watchdog = setTimeout(async () => {
    warn(`entire orchestration watchdog timed out after ${orchestrationTimeoutMs}ms during ${currentStage}`);
    printAllChildDiagnostics();
    exitCode = 1;
    await cleanupWithTimeout();
    process.exit(exitCode);
  }, orchestrationTimeoutMs);
  await main();
} catch (error) {
  warn(`failed during ${currentStage}: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  printAllChildDiagnostics();
  exitCode ||= 1;
} finally {
  if (watchdog) clearTimeout(watchdog);
  await cleanupWithTimeout();
}

process.exit(exitCode);
