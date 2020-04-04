import { serve } from "https://deno.land/std/http/server.ts";
import {
  acceptWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
  WebSocket
} from "https://deno.land/std/ws/mod.ts";

/** websocket echo server */
const port = Deno.args[0] || "8080";
console.log(`websocket server is running on :${port}`);
let clients: Array<WebSocket> = [];
for await (const req of serve(`:${port}`)) {
  const { headers, conn } = req;
  acceptWebSocket({
    conn,
    headers,
    bufReader: req.r,
    bufWriter: req.w,
  })
    .then(
      async (sock: WebSocket): Promise<void> => {
        console.log("socket connected!");
        clients.push(sock);
        const it = sock.receive();
        while (true) {
          try {
            const { done, value } = await it.next();
            if (done) {
              break;
            }
            const ev = value;
            if (typeof ev === "string") {
              // text message
              console.log("ws:Text", ev);
              clients.forEach((client) =>
                client == sock ? client.send("Message Sent") : client.send(ev)
              );
            } else if (isWebSocketPingEvent(ev)) {
              const [, body] = ev;
              // ping
              console.log("ws:Ping", body);
            } else if (isWebSocketCloseEvent(ev)) {
              // close
              const { code, reason } = ev;
              console.log("ws:Close", code, reason);
              //remove socket from clients
              clients = clients.filter((s) => s.conn.rid !== sock.conn.rid);
            }
          } catch (e) {
            console.error(`failed to receive frame: ${e}`);
            await sock.close(1000).catch(console.error);
          }
        }
      },
    )
    .catch((err: Error): void => {
      console.error(`failed to accept websocket: ${err}`);
    });
}
