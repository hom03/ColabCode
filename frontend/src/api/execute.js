export async function executeCode(language, code) {
  const res = await fetch("http://localhost:8080/execute", {
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