import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CodeEditor from "../components/Editor";
import TopBar from "../components/TopBar";
import RunButton from "../components/RunButton";
import OutputPanel from "../components/OutputPanel";
import LanguageSelector from "../components/LanguageSelector";
import TodoPanel from "../components/TODO";
import ActiveUsers from "../components/ActiveUsers";
import ChatPanel from "../components/ChatPanel";
import { connectCRDT } from "../api/crdtClient";
import "../styles/Editor.css";

export default function EditorPage() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  const [crdt, setCrdt] = useState(null);
  const [code, setCode] = useState("");
  const [lastEditor, setLastEditor] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("python");
  const [typingUser, setTypingUser] = useState("");
  const [remoteCursors, setRemoteCursors] = useState({});
  const [todos, setTodos] = useState([]);
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  const tabId = useRef(crypto.randomUUID());

  const logout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const getUserColor = (username) => {
    const colors = [
      "#ff6b6b",
      "#4ecdc4",
      "#ffe66d",
      "#5f9cff",
      "#c792ea",
      "#ff9f1c",
      "#2ec4b6",
      "#e71d36"
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Active users (local presence)
  useEffect(() => {
    if (!user) return;
    const id = tabId.current;

    const registerUser = () => {
      const users = JSON.parse(localStorage.getItem("activeUsers") || "[]");
      const filtered = users.filter(u => u.id !== id);
      filtered.push({
        id,
        username: user.username,
        role: user.role || "User",
        lastSeen: Date.now()
      });
      localStorage.setItem("activeUsers", JSON.stringify(filtered));
    };

    registerUser();
    const interval = setInterval(registerUser, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // CRDT connection
  useEffect(() => {
    const connection = connectCRDT((op) => {
      if (!op) return;

      if (op.type === "add") {
        try {
          let data = op.value
          try {
            data = JSON.parse(data);

            if (typeof data === "string"){
              data = JSON.parse(data);
            }
          } catch {
            return;
          }

          if (data.kind === "code") {
            setCode(data.code);
            setLastEditor(data.user);
          }

          if (data.kind === "cursor") {
            setRemoteCursors(prev => ({
              ...prev,
              [data.user]: {
                position: {
                  lineNumber: data.line,
                  column: data.column
                },
                color: data.color
              }
            }));
          }

          if (data.kind === "typing") {
            setTypingUser(data.user);
            setTimeout(() => setTypingUser(""), 1500);
          }

          if (data.kind === "todo") {
            setTodos(prev => {
              if (prev.includes(data.task)) return prev;
              return [...prev, data.task];
            });
          }

          if (data.kind === "todoRemove") {
            setTodos(prev => prev.filter(t => t !== data.task));
          }

          if (data.kind === "chat") {
            setMessages(prev => [...prev, data]);
          }
        } catch (err) {
          console.error("Failed to parse CRDT operation:", err);
        }
      }

      if (op.type === "output") {
        const [stdout, stderr] = op.value.split("|||");
        setOutput(stdout + "\n" + stderr);
      }
    });
    setCrdt(connection);

    return () => connection?.close();
  }, []);

  const handleCodeChange = (value) => {
    setCode(value);
    setLastEditor(user.username);

    crdt?.add({
      kind: "code",
      code: value,
      user: user.username,
      time: Date.now()
    });

    crdt?.add({
      kind: "typing",
      user: user.username
    });
  };

  const broadcastCursor = (position) => {
    crdt?.add({
      kind: "cursor",
      user: user.username,
      line: position.lineNumber,
      column: position.column,
      color: getUserColor(user.username)
    });
  };

  const runCode = () => {
    crdt?.execute(language, code);
  };

  return (
    <div className="ide-container">
      <TopBar user={user} onLogout={logout} />

      <div className="ide-main">
        <div className="ide-left">
          <div className="ide-filetree">
            <TodoPanel todos={todos} crdt={crdt} />
          </div>
          <div className="ide-active-users">
            <ActiveUsers />
          </div>
        </div>

        <div className="ide-center">
          <h1>ColabCode Editor</h1>
          <LanguageSelector language={language} setLanguage={setLanguage} />

          <div className="editor-status">
            Last edited by: {lastEditor || "-"}
          </div>

          {typingUser && (
            <div
              className="editor-typing"
              style={{ color: getUserColor(typingUser) }}
            >
              {typingUser} is typing...
            </div>
          )}

          <CodeEditor
            code={code}
            setCode={handleCodeChange}
            language={language}
            remoteCursors={remoteCursors}
            onCursorMove={broadcastCursor}
          />

          <RunButton onRun={runCode} />
          <OutputPanel output={output} />
        </div>

        <div className="ide-right">
          <ChatPanel messages={messages} crdt={crdt}/>
        </div>
      </div>
    </div>
  );
}
