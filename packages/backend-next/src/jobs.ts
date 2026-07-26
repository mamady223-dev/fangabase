import {
  LocalDeliveryPort,
  OutboxWorker,
  Scheduler,
} from "./infrastructure.js";
import { runtimeStore } from "./store.js";
import { WithdrawalService } from "./withdrawals.js";

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("SESSION_SECRET_REQUIRED");
}

const store = runtimeStore();
const outbox = new OutboxWorker(store, secret, new LocalDeliveryPort());
const mode = process.argv[2];

if (mode === "worker") {
  await outbox.runOnce(50);
} else if (mode === "scheduler") {
  await new Scheduler(store, outbox, new WithdrawalService(secret)).run();
} else {
  throw new Error("JOB_MODE_INVALID");
}
