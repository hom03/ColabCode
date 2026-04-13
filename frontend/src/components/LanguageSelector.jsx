export default function LanguageSelector({ language, setLanguage }) {
  return (
    <select value={language} onChange={(e) => setLanguage(e.target.value)}>
      <option value="python">Python</option>
      <option value="node">Node</option>
      <option value="java">Java</option>
      <option value="c_cpp">C/C++</option>
    </select>
  );
}