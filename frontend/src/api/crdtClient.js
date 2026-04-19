import { Operation, Empty } from "../proto/crdt_pb";
import { CRDTServiceClient } from "../proto/CrdtServiceClientPb";

const BASE_URL = "http://104.248.173.168:8080"

export function connectCRDT(onMessage) {
  const client = new CRDTServiceClient(BASE_URL,null,null);

  const stream = client.sync(new Empty(), {});

  stream.on("data", (response) => {
    const op = {
      type: response.getType(),
      value: response.getValue(),
    };

    console.log("CRDT received:", op);
    onMessage(op);
  });

  stream.on("error", (err) => {
    console.error("CRDT stream error:", err);
  });

  stream.on("end", () => {
    console.log("CRDT stream ended - reconnecting...");
    setTimeout(() => connectCRDT(onMessage), 1000);
  });

  return {
    add(value) {
      const op = new Operation();
      op.setType("add");
      op.setValue(JSON.stringify(value));

      client.sendOperation(op, {}, () => {});
    },

    execute(lang, code) {
      const op = new Operation();
      op.setType("execute");
      op.setValue(`${lang}|${code}`);

      client.sendOperation(op, {}, () => {});
    },

    close() {
      stream.cancel();
    }
  };
}