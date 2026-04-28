import { useEffect, useState, useRef, useMemo } from "react";
import { getUser } from "../api/auth";
import "../styles/ActiveUsers.css";

export default function ActiveUsers() {
  const [users, setUsers] = useState([]);
  const user = useMemo(() => getUser(), []);
  const idRef = useRef(crypto.randomUUID());

  useEffect(() => {
    if (!user) return;

    const updateUsers = () => {
      const stored = JSON.parse(localStorage.getItem("activeUsers") || "[]");
      const now = Date.now();

      const alive = stored.filter(u => now - u.lastSeen < 5000);

      const updated = [
        ...alive.filter(u => u.id !== idRef.current),
        {
          id: idRef.current,
          username: user.username || user.email || "unknown",
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
  }, []); // ← empty deps, mount/unmount only

  return (
    <div className="active-users-container">
      <h3>Active Users</h3>
      {users.length === 0 ? (
        <div>No active users</div>
      ) : (
        <ul>
          {users.map(u => (
            <li key={u.id}>
              <span className="user-name">
                {u.username} {u.id === idRef.current && "(You)"}
              </span>
              <span className="user-role">
                {u.role}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}