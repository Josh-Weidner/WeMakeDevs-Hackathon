import { createServer, type Server } from "node:http";
import type { HealthResponse, ReadinessResponse } from "@confy/shared/contracts";

/** Minimal probe server for k8s: /healthz (alive) and /readyz (ES reachable). */
export function createHealthServer(deps: { isReady: () => Promise<boolean> }): Server {
  return createServer((req, res) => {
    const send = (status: number, body: HealthResponse | ReadinessResponse) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (req.url === "/healthz") {
      send(200, { status: "ok", service: "confy-worker" });
      return;
    }
    if (req.url === "/readyz") {
      void deps
        .isReady()
        .catch(() => false)
        .then((ready) =>
          send(ready ? 200 : 503, {
            status: ready ? "ready" : "not_ready",
            dependencies: { elasticsearch: ready ? "ok" : "down" },
          }),
        );
      return;
    }
    res.writeHead(404).end();
  });
}
