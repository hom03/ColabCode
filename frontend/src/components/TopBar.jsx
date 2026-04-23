import React from "react";
import { useNavigate } from "react-router-dom";
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

  const displayName = user?.email || user?.username || "anonymous";

  return (
    <header style={styles.header}>
      <div style={styles.navLinks}>
        <button onClick={() => navigate("/editor")} style={styles.button}>
          Editor
        </button>

        {user?.role === "admin" && (
          <button onClick={() => navigate("/admin")} style={styles.button}>
            Admin
          </button>
        )}
      </div>

      <div style={styles.userInfo}>
        <span>{displayName} ({user?.role})</span>

        <button onClick={handleLogout} style={styles.button}>
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
};