import { startWorkflowWorker } from "./server/domain/claim-workflow";
import { checkDeployment } from "./server/core/deployment";
import { serve } from "@hono/node-server";
import { createApp } from "./app";

checkDeployment();

const port = Number(process.env.PORT ?? 4000);

createApp().then((app) => {
  startWorkflowWorker();
  serve({ fetch: app.fetch, port }, (info) => console.log(`Keeper API listening on http://localhost:${info.port}`));
});
