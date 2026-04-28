import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout as doLogout } from "../api/auth";
import "../styles/topbar.css";

export default function TopBar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      doLogout();
      navigate("/login");
    }
  };

  const displayName = user?.username || user?.email || "anonymous";
  const role = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "User";

  return (
    <header className="topbar">
      <nav className="topbar-nav">
        <Link to="/editor" className="topbar-link">Editor</Link>
        {user?.role === "admin" && (
          <Link to="/admin" className="topbar-link">Admin</Link>
        )}
      </nav>

      <div className="topbar-user">
        <span className="topbar-username">{displayName} ({role})</span>
        <button type="button" onClick={handleLogout} className="topbar-logout">
          Logout
        </button>
      </div>
    </header>
  );
}