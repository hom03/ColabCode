import { useState } from "react";

export default function ChatPanel({ messages, crdt }) {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(null);

  const handleTyping = (value) => {
    setInput(value);

    crdt?.add({
      kind: "chatTyping",
      user: user.username,
      time: Date.now()
    });
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    crdt?.add({
      kind: "chat",
      user: user.username,
      text: input.trim(),
      time: Date.now()
    });

    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px", borderBottom: "1px solid #ccc" }}>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>

      {typing && (
        <div style={{ fontStyle: "italic", padding: "5px" }}>
          {typing} is typing...
        </div>
      )}

      <div style={{ padding: "10px", borderTop: "1px solid #ccc" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          style={{ width: "80%" }}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          style={{ width: "15%", marginLeft: "2%" }}
        >
          →
        </button>
      </div>
    </div>
  );
}