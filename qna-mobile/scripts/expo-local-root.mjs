import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..");
const command = ["expo", ...args].join(" ");

if (!args.every((arg) => /^[a-zA-Z0-9:_./=-]+$/.test(arg))) {
  console.error(`Invalid Expo argument: ${args.join(" ")}`);
  process.exit(1);
}

const child = spawn(command, {
  cwd: appRoot,
  env: {
    ...process.env,
    EXPO_NO_METRO_WORKSPACE_ROOT: "1",
  },
  shell: true,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
