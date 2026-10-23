import { app } from "./app.js";
import { env } from "./config/env.js";
import { runOverdueEquipmentNotificationJob } from "./modules/notifications/notifications.service.js";

app.listen(env.PORT, () => {
  console.log(`IIITN HMS API listening on http://localhost:${env.PORT}`);
});

const runOverdueJob = () => runOverdueEquipmentNotificationJob().catch((error) => console.error("Overdue equipment notification job failed", error));
void runOverdueJob();
setInterval(runOverdueJob, 60_000).unref();
