import "../styles/activeusers.css";

export default function ActiveUsers({ users = [], currentUser }) {
  return (
    <div className="active-users-container">
      <h3>Active Users ({users.length})</h3>
      {users.length === 0 ? (
        <div>No active users</div>
      ) : (
        <ul>
          {users.map(u => (
            <li key={u.username}>
              <span className="user-name">
                {u.username} {u.username === currentUser && "(You)"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}