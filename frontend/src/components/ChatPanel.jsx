import { useState } from "react";
import { getUser } from "../api/auth";

export default function ChatPanel({ messages, crdt }) {
  const user = getUser();
  const username = user?.username || user?.email || "anonymous";

  const [input, setInput] = useState("");

  const handleTyping = (value) => {
    setInput(value);
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    crdt?.add({
      kind: "chat",
      user: username,
      text: input.trim(),
      time: Date.now()
    });

    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px", borderBottom: "1px solid #ccc" }}>
        {messages.map((msg, idx) => (
          <div key={(msg.time || idx) + "-" + msg.user}>
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px", borderTop: "1px solid #ccc" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          style={{ width: "80%" }}
          placeholder="Type a message..."
          disabled={!crdt}
        />
        <button
          onClick={sendMessage}
          style={{ width: "15%", marginLeft: "2%" }}
          disabled={!crdt}
        >
          →
        </button>
      </div>
    </div>
  );
}