export async function executeCode(language, code) {
  const res = await fetch("https://colabcode.up.railway.app/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language,
      code,
    }),
  });

  return res.json();
}