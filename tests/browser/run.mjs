// Run after npm run build. The test wrapper owns both loopback servers.
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdir,
  mkdtemp,
  cp,
  readFile,
  writeFile,
  symlink,
  rm,
  unlink,
} from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
const root = fileURLToPath(new URL("../../", import.meta.url));
const work = path.resolve(process.env.OLIVIQUE_TEST_WORK || tmpdir());
await mkdir(work, { recursive: true });
const fixture = await mkdtemp(path.join(work, "olivique-browser-"));
const children = [];
const next = path.join(root, "node_modules/next/dist/bin/next");
const env = {
  ...process.env,
  GOOGLE_SCRIPT_URL: "",
  GOOGLE_SCRIPT_TOKEN: "",
  SITE_URL: "",
  VERCEL_ENV: "",
  NEXT_TELEMETRY_DISABLED: "1",
};
let linked = false;
async function port() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const value = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return value;
}
async function serve(cwd, withMock) {
  const n = await port(),
    base = "http://127.0.0.1:" + n;
  const before = withMock
    ? [
        "--require",
        fileURLToPath(new URL("./sheets-fixture.cjs", import.meta.url)),
      ]
    : [];
  const child = spawn(
    process.execPath,
    [...before, next, "start", "--hostname", "127.0.0.1", "--port", String(n)],
    { cwd, env, windowsHide: true, stdio: "inherit" },
  );
  children.push(child);
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw Error("Local test server exited");
    try {
      if ((await fetch(base)).ok) return base;
    } catch {}
    await delay(150);
  }
  throw Error("Local test server did not become ready");
}
try {
  const modulePath = process.env.OLIVIQUE_PLAYWRIGHT;
  const { chromium } = await import(
    modulePath
      ? pathToFileURL(path.resolve(modulePath)).href
      : "playwright-core"
  );
  for (const file of [
    "app",
    "client",
    "content",
    "lib",
    "public",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "next-env.d.ts",
  ]) {
    await cp(path.join(root, file), path.join(fixture, file), {
      recursive: true,
    });
  }
  const config = path.join(fixture, "client/settings.json");
  const settings = JSON.parse(await readFile(config, "utf8"));
  settings.whatsappNumber = "201000000000";
  settings.deliveryFeeEgp = 45;
  await writeFile(config, JSON.stringify(settings, null, 2));
  await symlink(
    path.join(root, "node_modules"),
    path.join(fixture, "node_modules"),
    process.platform === "win32" ? "junction" : "dir",
  );
  linked = true;
  const build = spawn(process.execPath, [next, "build", "--webpack"], {
    cwd: fixture,
    env,
    windowsHide: true,
    stdio: "inherit",
  });
  if ((await once(build, "exit"))[0] !== 0) throw Error("Fixture build failed");
  const real = await serve(root, false),
    mock = await serve(fixture, true);
  const { checkJourney } = await import("./journey.mjs");
  await checkJourney(chromium, real, mock);
  const { checkMotion } = await import("./motion.mjs");
  await checkMotion(chromium, real);
} finally {
  await Promise.all(
    children.map(async (c) => {
      if (c.exitCode !== null) return;
      const exit = once(c, "exit");
      c.kill();
      await exit;
    }),
  );
  if (
    path.dirname(fixture) !== work ||
    !path.basename(fixture).startsWith("olivique-browser-")
  )
    throw Error("Unexpected fixture directory");
  if (linked) await unlink(path.join(fixture, "node_modules"));
  await rm(fixture, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 250,
  });
}
