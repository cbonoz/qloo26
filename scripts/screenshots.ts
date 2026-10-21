/**
 * LaunchLens walkthrough capture.
 *
 * Drives the local app in headless Chrome over the DevTools Protocol and saves
 * the product walkthrough to ./screenshots. The app must be running first:
 *
 *   bun run build && bun run start --port 3111
 *   bun run screenshots
 *
 * Environment:
 *   BASE_URL   app to capture (default http://localhost:3111)
 *   OUT_DIR    screenshot folder (default ./screenshots)
 *   CHROME     Chrome binary (default the system install)
 *   SKIP_LIVE  set to 1 to skip the live Qloo/xAI run and only capture the demo
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL || "http://localhost:3111";
const OUT_DIR = process.env.OUT_DIR || fileURLToPath(new URL("../screenshots", import.meta.url));
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const DEBUG_PORT = Number(process.env.DEBUG_PORT || 9222);
const SKIP_LIVE = process.env.SKIP_LIVE === "1";
const PROFILE_DIR = "/tmp/launchlens-chrome-profile";
const DEMO_GOAL = "Launch a small-space furniture line for people living in compact homes in Seoul.";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type CdpResult = Record<string, unknown>;
type Target = { type: string; url: string; webSocketDebuggerUrl: string };

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(BASE_URL, { cache: "no-store" });
      if (response.ok) return;
    } catch {
      // Server not up yet.
    }
    await sleep(500);
  }
  throw new Error(`No app responding at ${BASE_URL}. Start it with: bun run start --port 3111`);
}

function startChrome(): ChildProcess {
  return spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      "--no-first-run",
      "--disable-gpu",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
}

async function findPageTarget(): Promise<Target> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const targets = (await response.json()) as Target[];
      const page = targets.find((item) => item.type === "page");
      if (page) return page;
    } catch {
      // Chrome may not be listening yet.
    }
    await sleep(250);
  }
  throw new Error("No Chrome page target found.");
}

class Cdp {
  private socket: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (value: CdpResult) => void; reject: (reason: unknown) => void }>();
  private listeners: Array<(method: string) => void> = [];

  constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number;
        method?: string;
        result?: CdpResult;
        error?: { message: string };
      };
      const id = message.id;
      if (id !== undefined && this.pending.has(id)) {
        const entry = this.pending.get(id)!;
        this.pending.delete(id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result ?? {});
        return;
      }
      if (message.method) {
        for (const listener of this.listeners) listener(message.method);
      }
    });
  }

  send(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise<CdpResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (!this.pending.has(id)) return;
        this.pending.delete(id);
        reject(new Error(`Timed out: ${method}`));
      }, 90_000);
    });
  }

  waitFor(method: string, timeoutMs = 30_000) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const listener = (eventMethod: string) => {
        if (eventMethod !== method) return;
        clearTimeout(timer);
        this.listeners = this.listeners.filter((item) => item !== listener);
        resolve();
      };
      this.listeners.push(listener);
    });
  }
}

async function main() {
  await waitForServer();
  mkdirSync(OUT_DIR, { recursive: true });

  const chrome = startChrome();
  const target = await findPageTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise<void>((resolve) => socket.addEventListener("open", () => resolve()));
  const cdp = new Cdp(socket);

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

  const evaluate = async (expression: string): Promise<unknown> => {
    const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error("Evaluation failed in the page.");
    const remote = result.result as { value?: unknown } | undefined;
    return remote?.value;
  };

  const clickByText = async (text: string) => {
    const clicked = await evaluate(`(() => {
      const node = [...document.querySelectorAll("button, a")].find((item) => (item.textContent || "").includes(${JSON.stringify(text)}));
      if (!node) return false;
      node.click();
      return true;
    })()`);
    if (clicked !== true) throw new Error(`Could not find a clickable element for: ${text}`);
    await sleep(700);
  };

  const setField = async (selector: string, value: string, kind: "input" | "textarea") => {
    await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const proto = ${kind === "input" ? "window.HTMLInputElement" : "window.HTMLTextAreaElement"}.prototype;
      Object.getOwnPropertyDescriptor(proto, "value").set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    await sleep(300);
  };

  const shoot = async (name: string) => {
    const metrics = await cdp.send("Page.getLayoutMetrics");
    const size = metrics.contentSize as { width: number; height: number } | undefined;
    const width = size?.width ?? 1440;
    const height = size?.height ?? 900;
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height, scale: 1 },
    });
    writeFileSync(`${OUT_DIR}/${name}.png`, Buffer.from(String(shot.data), "base64"));
    console.log(`saved ${name}.png (${Math.round(width)}x${Math.round(height)})`);
  };

  const goto = async (url: string) => {
    const loaded = cdp.waitFor("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await loaded;
    await sleep(900);
  };

  await goto(BASE_URL);
  await shoot("01-landing");

  await clickByText("Start a market check");
  await shoot("02-brand-and-market");

  await setField("#brand", "IKEA", "input");
  await setField("#market", "Seoul, South Korea", "input");
  await clickByText("Continue");
  await setField("#goal", DEMO_GOAL, "textarea");
  await clickByText("Suggest cultural references");
  await sleep(20_000);
  await shoot("03-goal-and-suggested-references");

  await clickByText("Continue");
  await shoot("04-campaign-comparison");

  // Demo path: the saved snapshot answers without a live API call.
  await clickByText("Back");
  await clickByText("Back");
  await clickByText("Fill demo data");
  await sleep(900);
  await shoot("05-demo-brief-preview");
  await clickByText("View example report");
  await sleep(1_500);
  await shoot("06-demo-results-recommendation");

  if (!SKIP_LIVE) {
    // Live path with no campaign ideas: ranked first tests instead of a verdict.
    await clickByText("New market check");
    await setField("#brand", "IKEA", "input");
    await setField("#market", "Seoul, South Korea", "input");
    await clickByText("Continue");
    await setField("#goal", DEMO_GOAL, "textarea");
    await clickByText("Suggest cultural references");
    await sleep(20_000);
    await clickByText("Continue");
    await clickByText("Continue");
    await sleep(600);
    await shoot("07-live-brief-preview-no-campaigns");
    await clickByText("Run market check");
    await sleep(40_000);
    await shoot("08-live-results-ranked-ideas");
  }

  socket.close();
  chrome.kill();
  console.log(`\nScreenshots written to ${OUT_DIR}`);
}

await main();
