import { useState, useRef, useEffect } from "react";
import { getUser } from "../api/auth";

export default function ChatPanel({ messages, crdt }) {
  const user = getUser();
  const username = user?.username || user?.email || "anonymous";
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
    }) + " " + d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
      <div style={{ flex: 1, overflowY: "auto", padding: "10px", borderBottom: "1px solid #333" }}>
        {messages.map((msg, idx) => (
          <div key={(msg.time || idx) + "-" + msg.user} style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <strong style={{ fontSize: "13px" }}>{msg.user}</strong>
              <span style={{ color: "#666", fontSize: "11px" }}>{formatTime(msg.time)}</span>
            </div>
            <div style={{ fontSize: "13px", marginTop: "2px" }}>{msg.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "10px", borderTop: "1px solid #333", display: "flex", gap: "6px" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          style={{ flex: 1, padding: "6px 8px", borderRadius: "4px", border: "1px solid #444", background: "#1e1e1e", color: "white" }}
          placeholder="Type a message..."
          disabled={!crdt}
        />
        <button
          onClick={sendMessage}
          disabled={!crdt}
          style={{ padding: "6px 12px" }}
        >
          →
        </button>
      </div>
    </div>
  );
}