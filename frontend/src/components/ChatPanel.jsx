import { useState, useRef, useEffect } from "react";
import { getUser } from "../api/auth";
import "../styles/chatpanel.css";

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
    <div className="chat-panel">
      <div className="chat-panel-header">Chat</div>

      <div className="chat-messages">
        {[...messages].sort((a, b) => a.time - b.time).map((msg, idx) => (
          <div key={(msg.time || idx) + "-" + msg.user} className="chat-message">
            <div className="chat-message-meta">
              <span className="chat-message-user">{msg.user}</span>
              <span className="chat-message-time">{formatTime(msg.time)}</span>
            </div>
            <div className="chat-message-text">{msg.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
          className="chat-input"
          placeholder={crdt ? "Type a message..." : "Connecting..."}
          disabled={!crdt}
        />
        <button
          onClick={sendMessage}
          disabled={!crdt}
          className="chat-send-btn"
        >
          →
        </button>
      </div>
    </div>
  );
}