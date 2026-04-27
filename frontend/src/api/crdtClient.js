import { Operation, Empty } from "../proto/crdt_pb";
import { CRDTServiceClient } from "../proto/CrdtServiceClientPb";

const BASE_URL = "https://api.colabcode-fyp.dev";

export function connectCRDT(onMessage) {
  const client = new CRDTServiceClient(BASE_URL, null, null);
  const stream = client.sync(new Empty(), {});
  let closed = false;

  stream.on("data", (response) => {
    if (closed) return;

    const op = {
      type: response.getType(),
      value: response.getValue(),
    };

    onMessage(op);
  });

  stream.on("error", (err) => {
    if (!closed) {
      console.error("CRDT stream error:", err);
    }
  });

  stream.on("end", () => {
    if (!closed) {
      console.log("CRDT stream ended - reconnecting...");
      setTimeout(() => connectCRDT(onMessage), 1000);
    }
  });

  return {
    add(value) {
      const op = new Operation();
      op.setType("add");
      op.setValue(
        typeof value === "string" ? value : JSON.stringify(value)
      );

      client.sendOperation(op, {}, (err) => {
        if (err) console.error("sendOperation error:", err);
      });
    },

    execute(lang, code) {
      const op = new Operation();
      op.setType("execute");
      op.setValue(`${lang}|${code}`);

      client.sendOperation(op, {}, (err) => {
        if (err) console.error("execute error:", err);
      });
    },

    close() {
      closed = true;
      stream.cancel();
    },
  };
}