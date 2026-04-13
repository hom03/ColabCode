import { useEffect, useState } from "react";
import "../styles/ActiveUsers.css";

export default function ActiveUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = JSON.parse(localStorage.getItem("activeUsers") || "[]");

      const alive = stored.filter(
        u => Date.now() - u.lastSeen < 5000
      );

      setUsers(alive);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: "10px" }}>
      <h4>Active Users</h4>
      {users.map(u => (
        <div key={u.id}>
          {u.username} ({u.role})
        </div>
      ))}
    </div>
  );
}