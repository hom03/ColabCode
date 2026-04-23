export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(token) {
  localStorage.setItem("token", token);

  try {
    const payload = JSON.parse(base64UrlDecode(token.split(".")[1]));
    localStorage.setItem("user", JSON.stringify(payload));
  } catch {
    console.warn("Invalid token payload");
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function base64UrlDecode(str) {
  return decodeURIComponent(
    atob(str.replace(/-/g, "+").replace(/_/g, "/"))
      .split("")
      .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
}

export function getUser() {
  const stored = localStorage.getItem("user");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem("user");
    }
  }

  const token = getToken();
  if (!token) return null;

  try {
    return JSON.parse(base64UrlDecode(token.split(".")[1]));
  } catch {
    return null;
  }
}
