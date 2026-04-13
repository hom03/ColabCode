import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
  e.preventDefault();

  const collaborators = JSON.parse(
    localStorage.getItem("collaborators") || "[]"
  );

  if (role !== "admin") {
    const allowed = collaborators.some(
      c => c.username === email
    );

    if (!allowed) {
      setError("You are not invited to this workspace.")
      return;
    }
  }

  const user = { username, email, role };
  sessionStorage.setItem("user", JSON.stringify(user));
  navigate("/editor");
};

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>ColabCode Login</h2>
        {error ? <div className="login-error">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="role-selection">
            <label>
              <input
                type="radio"
                value="user"
                checked={role === "user"}
                onChange={() => setRole("user")}
              />
              User
            </label>
            <label style={{ marginLeft: 10 }}>
              <input
                type="radio"
                value="admin"
                checked={role === "admin"}
                onChange={() => setRole("admin")}
              />
              Admin
            </label>
          </div>
          <button type="submit">Enter Workspace</button>
        </form>
      </div>
    </div>
  );
}