import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

export default function CodeEditor({
  code,
  setCode,
  language = "python",
  remoteCursors = {},
  onCursorMove
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.onDidChangeCursorPosition((e) => {
      if (!onCursorMove) return;

      onCursorMove({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });
  };

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;

    const decorations = Object.entries(remoteCursors || {}).map(
      ([username, data]) => ({
        range: new monaco.Range(
          data.lineNumber,
          data.column,
          data.lineNumber,
          data.column + 1
        ),
        options: {
          className: "remote-cursor",
          style: {
            borderLeft: `2px solid ${data.color}`
          },
          after: {
            content: username,
            inlineClassName: "remote-cursor-label",
            backgroundColor: data.color
          }
        }
      })
    );

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [remoteCursors]);

  return (
    <Editor
      height="50%"
      width="100%"
      language={language}
      value={code}
      onChange={(value) => setCode(value)}
      theme="vs-dark"
      options={{
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        fontFamily: "monospace",
        fontSize: 14,
        minimap: { enabled: false },
      }}
      onMount={handleEditorDidMount}
    />
  );
}