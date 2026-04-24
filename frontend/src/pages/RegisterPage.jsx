import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import "../styles/login.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const res = await apiFetch("/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Registration failed");
        return;
      }

      navigate("/login");

    } catch {
      setError("Server error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Create Account</h2>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleRegister}>
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

          <input
            placeholder="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <button type="submit">Create Account</button>
        </form>

        <p style={{ marginTop: "10px" }}>
          Already have an account?{" "}
          <span
            style={{ color: "#5f9cff", cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}