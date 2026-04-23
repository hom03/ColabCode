import { useEffect, useState, useRef } from "react";
import { getUser } from "../api/auth";
import "../styles/ActiveUsers.css";

export default function ActiveUsers() {
  const [users, setUsers] = useState([]);
  const user = getUser();
  const idRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!user) return;

    const updateUsers = () => {
      const stored = JSON.parse(localStorage.getItem("activeUsers") || "[]");
      const now = Date.now();

      // remove stale users (5s)
      const alive = stored.filter(u => now - u.lastSeen < 5000);

      // add/update current user
      const updated = [
        ...alive.filter(u => u.id !== idRef.current),
        {
          id: idRef.current,
          username: user.email || user.username || "unknown",
          role: (user.role || "User").replace(/^./, c => c.toUpperCase()),
          lastSeen: now
        }
      ];

      localStorage.setItem("activeUsers", JSON.stringify(updated));
      setUsers(updated);
    };

    updateUsers();
    const interval = setInterval(updateUsers, 1000);

    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="active-users">
      <h4>Active Users</h4>

      {users.length === 0 && <div>No active users</div>}

      {users.map(u => (
        <div key={u.id}>
          {u.username} ({u.role}){" "}
          {u.id === idRef.current && "(You)"}
        </div>
      ))}
    </div>
  );
}