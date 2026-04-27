import { Operation, Empty } from "../proto/crdt_pb";
import { CRDTServiceClient } from "../proto/CrdtServiceClientPb";

const BASE_URL = "https://api.colabcode-fyp.dev";

export function connectCRDT(onMessage) {
  const client = new CRDTServiceClient(BASE_URL, null, null);
  let stream = null;
  let closed = false;

  function startStream() {
    if (closed) return;

    stream = client.sync(new Empty(), {});

    stream.on("data", (response) => {
      if (closed) return;
      onMessage({
        type: response.getType(),
        value: response.getValue(),
      });
    });

    stream.on("error", (err) => {
      if (closed) return;
      console.error("CRDT stream error:", err);
    });

    stream.on("end", () => {
      if (closed) return;
      console.log("CRDT stream ended - reconnecting...");
      setTimeout(() => {
        if (!closed) startStream();
      }, 1000);
    });
  }

  startStream();

  return {
    add(value) {
      if (closed) return;
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
      if (closed) return;
      const op = new Operation();
      op.setType("execute");
      op.setValue(`${lang}|${code}`);
      client.sendOperation(op, {}, (err) => {
        if (err) console.error("execute error:", err);
      });
    },

    close() {
      closed = true;
      stream?.cancel();
    },
  };
}