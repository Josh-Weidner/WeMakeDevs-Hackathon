import { loadConfig } from "./config.js";
import { createContainer } from "./container.js";
import { buildServer } from "./server.js";

const config = loadConfig();
const container = createContainer(config);
const app = await buildServer(container);

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  await app.close();
  await container.close();
  process.exit(0);
}
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ port: config.PORT, host: config.HOST });
