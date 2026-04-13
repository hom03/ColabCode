export default function OutputPanel({ output }) {
  return (
    <pre style={{ background: "#111", color: "#0f0", padding: "10px" }}>
      {output}
    </pre>
  );
}