// Runs the tests against local copies of both sites (started here with `wrangler dev`, then stopped).
//   node tools/run-tests.mjs relay   the room server: 68 checks on the Holy Huddle site, 16 on the Spark Wars site
//   node tools/run-tests.mjs e2e     whole games in a browser (Playwright): Holy Huddle, a Spark Wars night with 30
//                                    players, a Lightning Round at tables, a Bonfire night with 40, and two rounds
//                                    of Lights Out with 12, and Signal Divide at 12 to 15. Slow (about 20 minutes).
// Run `npm run build` first. Screenshots from the e2e tests go to tests/e2e/shots/ (not committed).
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SERVER = path.join(ROOT, "huddle", "server");
const which = process.argv[2] || "relay";
const LOCAL = "http://localhost:*,http://127.0.0.1:*";

/** Start `wrangler dev` for one site; resolves when it answers /health. */
async function serve(name, port, args) {
  const child = spawn("npx", ["wrangler", "dev", "--port", String(port), "--ip", "127.0.0.1", "--var", `ALLOWED_ORIGINS:${LOCAL}`, ...args], {
    cwd: SERVER, detached: true, stdio: "ignore", env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
  });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return child; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  stop(child);
  throw new Error(`${name} didn't start on port ${port}`);
}
function stop(child) { try { process.kill(-child.pid); } catch {} }

/** Run one test script; resolves true when it passes. */
function run(label, file, args) {
  return new Promise((resolve) => {
    console.log(`\n=== ${label}`);
    const env = { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" };
    const child = spawn(process.execPath, [file, ...args], { cwd: ROOT, stdio: "inherit", env });
    child.on("exit", (code) => resolve(code === 0));
  });
}

const servers = [];
const results = [];
try {
  if (which === "relay") {
    // Short idle timer and a low lookup limit, so the clean-up and code-guessing tests finish quickly.
    servers.push(await serve("Holy Huddle", 8787, ["--var", "IDLE_MINUTES:0.08", "--var", "LIMIT_LOOK:40"]));
    servers.push(await serve("Spark Wars", 8788, ["--env", "spark"]));
    results.push(["relay: Holy Huddle site", await run("Relay tests: Holy Huddle site", "huddle/server/test/bots.mjs", ["http://127.0.0.1:8787", "http://localhost:3000"])]);
    results.push(["relay: Spark Wars site", await run("Relay tests: Spark Wars site", "huddle/server/test/spark.mjs", ["http://127.0.0.1:8788"])]);
  } else if (which === "e2e") {
    servers.push(await serve("Holy Huddle", 8787, []));
    servers.push(await serve("Spark Wars", 8788, ["--env", "spark"]));
    // (DIVIDE_FAST: Signal Divide's clock 30 times quicker, so whole matches fit in a test. Never set on the real site.)
    servers.push(await serve("Bonfire", 8789, ["--env", "bonfire", "--var", "DIVIDE_FAST:1"]));
    const shots = (n) => path.join("tests", "e2e", "shots", n);
    results.push(["e2e: Holy Huddle game", await run("Holy Huddle: a whole game", "tests/e2e/holy-huddle.cjs", ["http://127.0.0.1:8787", shots("holy"), "jericho,order"])]);
    results.push(["e2e: Spark Wars night", await run("Spark Wars: a night with 30 players", "tests/e2e/spark-night.cjs", ["http://127.0.0.1:8788", shots("night")])]);
    results.push(["e2e: Lightning Round at tables", await run("Spark Wars: Lightning Round at 4 tables", "tests/e2e/lightning.cjs", ["http://127.0.0.1:8788", shots("lightning"), "4", "4"])]);
    results.push(["e2e: Bonfire night", await run("Bonfire: a night with 40 people", "tests/e2e/bonfire.cjs", ["http://127.0.0.1:8789", shots("bonfire"), "40"])]);
    results.push(["e2e: Lights Out", await run("Lights Out: two rounds with 12 players", "tests/e2e/lights-out.cjs", ["http://127.0.0.1:8789", shots("lights"), "12"])]);
    results.push(["e2e: Signal Divide", await run("Signal Divide: a match at 12, 13, 14 and 15 players", "tests/e2e/signal-divide.cjs", ["http://127.0.0.1:8789", shots("divide"), "12,13,14,15"])]);
  } else throw new Error(`unknown test set "${which}" (relay or e2e)`);
} finally {
  servers.forEach(stop);
}
console.log("\n" + results.map(([n, ok]) => `${ok ? "PASS" : "FAIL"}  ${n}`).join("\n"));
process.exit(results.every(([, ok]) => ok) ? 0 : 1);
