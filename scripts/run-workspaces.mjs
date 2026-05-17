import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

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
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

const runnableWorkspaces = workspaces.filter((workspace) =>
  hasScript(workspace, script),
);

if (runnableWorkspaces.length === 0) {
  console.error(`No workspace exposes an npm script named "${script}".`);
  process.exit(1);
}

for (const workspace of runnableWorkspaces) {
  const child = spawn(`npm --workspaces=false run ${script}`, {
    cwd: resolve(workspace),
    stdio: "inherit",
    shell: true,
  });

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
