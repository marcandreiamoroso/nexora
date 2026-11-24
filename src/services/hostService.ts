import type { ServerRequest } from "@modules/nexora-net";
import * as NexoraNet from "@modules/nexora-net";

type Reply = { status: number; body: unknown };
type Handler = (req: ServerRequest) => Reply | Promise<Reply>;

const routes: Record<string, Handler> = {};
let deviceName = "Nexora device";
let subscription: { remove: () => void } | null = null;

export function route(method: string, path: string, handler: Handler) {
  routes[`${method} ${path}`] = handler;
}

route("GET", "/ping", () => ({
  status: 200,
  body: { app: "nexora", protocol: 1, name: deviceName },
}));

async function handle(req: ServerRequest) {
  let reply: Reply;
  try {
    const handler = routes[`${req.method} ${req.path}`];
    reply = handler
      ? await handler(req)
      : { status: 404, body: { error: "not_found" } };
  } catch {
    reply = { status: 500, body: { error: "server_error" } };
  }
  NexoraNet.respondToRequest(req.id, reply.status, JSON.stringify(reply.body));
}

export function startHosting(name: string, port: number): number {
  deviceName = name;
  subscription?.remove();
  subscription = NexoraNet.addRequestListener(handle);
  return NexoraNet.startServer(port);
}

export function stopHosting() {
  subscription?.remove();
  subscription = null;
  NexoraNet.stopServer();
}
