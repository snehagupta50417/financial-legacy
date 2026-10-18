import { serve } from "@hono/node-server";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);

createApp().then((app) => {
  serve({ fetch: app.fetch, port }, (info) => console.log(`Keeper API listening on http://localhost:${info.port}`));
});
