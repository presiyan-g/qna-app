import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const script = process.argv[2];

if (!script) {
  console.error("Usage: node scripts/run-workspaces.mjs <script>");
  process.exit(1);
}

const rootPackage = JSON.parse(readFileSync("package.json", "utf8"));
const workspaces = rootPackage.workspaces ?? [];
const children = new Map();
let shuttingDown = false;

if (!/^[a-zA-Z0-9:_-]+$/.test(script)) {
  console.error(`Invalid npm script name: "${script}".`);
  process.exit(1);
}

function hasScript(workspace, scriptName) {
  const packageJsonPath = join(workspace, "package.json");
  const workspacePackage = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  return Boolean(workspacePackage.scripts?.[scriptName]);
}

function stopChildren() {
  shuttingDown = true;

  for (const child of children.values()) {
    stopChild(child);
  }
}

function stopChild(child) {
  if (child.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function getNpmCommand() {
  if (process.platform !== "win32") {
    return { command: "npm", args: [] };
  }

  const bundledNpmCli = join(
    dirname(process.execPath),
    "node_modules",
    "npm",
    "bin",
    "npm-cli.js",
  );
  const npmCli = process.env.npm_execpath ?? bundledNpmCli;

  if (existsSync(npmCli)) {
    return { command: process.execPath, args: [npmCli] };
  }

  return { command: "cmd.exe", args: ["/d", "/s", "/c", "npm"] };
}

const runnableWorkspaces = workspaces.filter((workspace) =>
  hasScript(workspace, script),
);

if (runnableWorkspaces.length === 0) {
  console.error(`No workspace exposes an npm script named "${script}".`);
  process.exit(1);
}

for (const workspace of runnableWorkspaces) {
  const npmCommand = getNpmCommand();
  const child = spawn(
    npmCommand.command,
    [...npmCommand.args, "--workspaces=false", "run", script],
    {
      cwd: resolve(workspace),
      stdio: "inherit",
    },
  );

  children.set(workspace, child);

  child.on("exit", (code, signal) => {
    children.delete(workspace);

    if (shuttingDown) {
      return;
    }

    if (code !== 0) {
      stopChildren();
      process.exitCode = code ?? 1;
      return;
    }

    if (signal) {
      stopChildren();
      process.exitCode = 1;
      return;
    }

    if (children.size === 0) {
      process.exitCode = 0;
    }
  });
}

process.on("SIGINT", () => {
  stopChildren();
});

process.on("SIGTERM", () => {
  stopChildren();
});
