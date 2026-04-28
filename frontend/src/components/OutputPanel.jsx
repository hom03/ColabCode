export default function OutputPanel({ output }) {
  return (
    <pre className="output-panel">
      {output || "Output will appear here..."}
    </pre>
  );
}