import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout as doLogout } from "../api/auth";

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
    <header style={styles.header}>
      <div style={styles.navLinks}>
        <Link to="/editor" style={styles.linkButton}>
          Editor
        </Link>

        {user?.role === "admin" && (
          <Link 
            to="/admin" 
            style={styles.linkButton}
            onClick={(e) => {
              e.preventDefault();
              console.log("Admin clicked, navigating...");
              navigate("/admin");
            }}
          >
            Admin
          </Link>
        )}
      </div>

      <div style={styles.userInfo}>
        <span>{displayName} ({role})</span>

        <button type="button" onClick={handleLogout} style={styles.button}>
          Logout
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    backgroundColor: "#1E1E1E",
    color: "white",
  },
  navLinks: {
    display: "flex",
    gap: "10px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  button: {
    backgroundColor: "#3A3A3A",
    color: "white",
    border: "none",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: "4px",
  },
  linkButton: {
    backgroundColor: "#3A3A3A",
    color: "white",
    border: "none",
    padding: "6px 12px",
    cursor: "pointer",
    borderRadius: "4px",
    textDecoration: "none",
    display: "inline-block",
  },
};