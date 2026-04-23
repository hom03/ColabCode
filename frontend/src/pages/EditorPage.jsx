import { useState, useEffect } from "react";
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
import { getUser, logout } from "../api/auth";
import "../styles/editor.css";

export default function EditorPage() {
  const navigate = useNavigate();
  const user = getUser();

  const [crdt, setCrdt] = useState(null);
  const [code, setCode] = useState("");
  const [lastEditor, setLastEditor] = useState("");
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("python");
  const [typingUser, setTypingUser] = useState("");
  const [remoteCursors, setRemoteCursors] = useState({});
  const [todos, setTodos] = useState([]);
  const [messages, setMessages] = useState([]);

  const username = user?.email || user?.username || "anonymous";

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Color generator
  const getUserColor = (name) => {
    const colors = ["#ff6b6b","#4ecdc4","#ffe66d","#5f9cff","#c792ea","#ff9f1c"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // CRDT connection (only when authenticated)
  useEffect(() => {
    if (!user) return;

    const connection = connectCRDT((op) => {
      if (!op) return;

      if (op.type === "add") {
        let data;

        try {
          data = JSON.parse(op.value);
          if (typeof data === "string") {
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
          setTodos(prev =>
            prev.includes(data.task) ? prev : [...prev, data.task]
          );
        }

        if (data.kind === "todoRemove") {
          setTodos(prev => prev.filter(t => t !== data.task));
        }

        if (data.kind === "chat") {
          setMessages(prev => [...prev, data]);
        }
      }

      if (op.type === "output") {
        const [stdout, stderr] = op.value.split("|||");
        setOutput((stdout || "") + "\n" + (stderr || ""));
      }
    });

    setCrdt(connection);

    return () => connection?.close();
  }, [user]);

  // ✏️ Code changes
  const handleCodeChange = (value) => {
    setCode(value);
    setLastEditor(username);

    crdt?.add({
      kind: "code",
      code: value,
      user: username,
      time: Date.now()
    });

    crdt?.add({
      kind: "typing",
      user: username
    });
  };

  // Cursor broadcast
  const broadcastCursor = (position) => {
    crdt?.add({
      kind: "cursor",
      user: username,
      line: position.lineNumber,
      column: position.column,
      color: getUserColor(username)
    });
  };

  // Run code
  const runCode = () => {
    crdt?.execute(language, code);
  };

  return (
    <div className="ide-container">
      <TopBar user={user} onLogout={handleLogout} />

      <div className="ide-main">
        <div className="ide-left">
          <TodoPanel todos={todos} crdt={crdt} />
          <ActiveUsers />
        </div>

        <div className="ide-center">
          <h1>ColabCode Editor</h1>

          <LanguageSelector
            language={language}
            setLanguage={setLanguage}
          />

          <div className="editor-status">
            Last edited by: {lastEditor || "-"}
          </div>

          {typingUser && (
            <div style={{ color: getUserColor(typingUser) }}>
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
          <ChatPanel messages={messages} crdt={crdt} />
        </div>
      </div>
    </div>
  );
}