import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { getUser, logout } from "../api/auth";
import { useActiveUsers } from "../context/ActiveUsersContext";
import "../styles/admin.css";

export default function AdminPage() {
  const navigate = useNavigate();
  const user = useMemo(() => getUser(), []);
  const { activeUsers, setActiveUsers } = useActiveUsers();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "admin") {
      navigate("/editor");
    }
  }, [user, navigate]);

  const displayName = user?.username || user?.email;

  const [e2eeEnabled, setE2eeEnabled] = useState(() => {
    const saved = localStorage.getItem("e2eeEnabled");
    return saved ? JSON.parse(saved) : true;
  });

  const [lastChanged, setLastChanged] = useState(() => {
    const saved = localStorage.getItem("e2eeLastChanged");
    return saved ? new Date(saved) : new Date();
  });

  const [keyVersion, setKeyVersion] = useState(() => {
    const saved = localStorage.getItem("keyVersion");
    return saved ? parseInt(saved) : 1;
  });

  const [inviteUser, setInviteUser] = useState("");

  const [publicKey, setPublicKey] = useState(
    localStorage.getItem("publicKey") || "PUB-ABCD-1234-XYZ"
  );

  const [privateKey, setPrivateKey] = useState(
    localStorage.getItem("privateKey") || "PRIV-SECRET-9876"
  );

  const fingerprint = publicKey
    .split("")
    .map(c => c.charCodeAt(0).toString(16))
    .join(":")
    .slice(0, 32);

  const formatDate = (date) =>
    date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const handleToggleE2EE = () => {
    const newValue = !e2eeEnabled;
    const now = new Date();
    setE2eeEnabled(newValue);
    setLastChanged(now);
    localStorage.setItem("e2eeEnabled", JSON.stringify(newValue));
    localStorage.setItem("e2eeLastChanged", now.toISOString());
  };

  const handleRotateKeys = () => {
    const newVersion = keyVersion + 1;
    const now = new Date();
    setKeyVersion(newVersion);
    setLastChanged(now);
    localStorage.setItem("keyVersion", newVersion);
    localStorage.setItem("e2eeLastChanged", now.toISOString());
  };

  const handleInvite = () => {
    if (!inviteUser) return alert("Enter a username/email first");
    const collaborators = JSON.parse(localStorage.getItem("collaborators") || "[]");
    const filtered = collaborators.filter(c => c.username !== inviteUser);
    filtered.push({ username: inviteUser, role: "User", lastSeen: Date.now() });
    localStorage.setItem("collaborators", JSON.stringify(filtered));
    setInviteUser("");
    alert(`${inviteUser} invited successfully!`);
  };

  const handleRemoveUser = (username) => {
    if (!window.confirm(`Remove ${username} from the session?`)) return;
    setActiveUsers(prev => prev.filter(u => u.username !== username));
  };

  const handleExportPublicKey = () => {
    const blob = new Blob([publicKey], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "public-key.txt";
    a.click();
  };

  const handleDownloadPrivate = () => {
    const data = { privateKey, version: keyVersion, created: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "private-key-backup.json";
    a.click();
  };

  const handleFingerprint = () => {
    alert(`Fingerprint:\n${fingerprint}\nVersion: v${keyVersion}`);
  };

  const handleUploadBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result);
      setPrivateKey(data.privateKey);
      localStorage.setItem("privateKey", data.privateKey);
      alert("Private key restored");
    };
    reader.readAsText(file);
  };

  const handleRecoveryKit = () => {
    const kit = { publicKey, privateKey, version: keyVersion, created: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(kit, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "recovery-kit.json";
    a.click();
  };

  if (!user) return null;

  return (
    <div className="admin-container">
      <TopBar
        user={user}
        onLogout={() => {
          logout();
          navigate("/login");
        }}
      />

      <div className="admin-main">
        <h1>Admin Dashboard</h1>

        {/* Active Users */}
        <section className="admin-section">
          <h2>Active Users ({activeUsers.length})</h2>
          {activeUsers.length === 0 ? (
            <p>No users currently connected.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map(u => (
                  <tr key={u.username}>
                    <td>{u.username} {u.username === displayName && <span className="you-badge">(You)</span>}</td>
                    <td>{u.role || "user"}</td>
                    <td>
                      {u.username !== displayName && (
                        <button
                          className="remove-btn"
                          onClick={() => handleRemoveUser(u.username)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* E2EE */}
        <section className="admin-section">
          <h2>End-to-End Encryption</h2>
          <div className="e2ee-status-row">
            <span>E2EE Status: <strong>{e2eeEnabled ? "Enabled" : "Disabled"}</strong></span>
            <input type="checkbox" checked={e2eeEnabled} onChange={handleToggleE2EE} />
          </div>
          <p>Last Change: {formatDate(lastChanged)}</p>
          <p>Owner: {displayName}</p>
          <p>Fingerprint: {fingerprint}</p>
          <p>Key Version: v{keyVersion}</p>
          <button onClick={handleExportPublicKey}>Export Public Key</button>
          <button onClick={handleDownloadPrivate}>Download Private Key</button>
          <button onClick={handleFingerprint}>View Fingerprint</button>
        </section>

        {/* Key Rotation */}
        <section className="admin-section">
          <h2>Key Rotation</h2>
          <button onClick={handleRotateKeys}>Rotate Keys</button>
        </section>

        {/* Invite */}
        <section className="admin-section">
          <h2>Invite Collaborator</h2>
          <textarea
            value={inviteUser}
            onChange={(e) => setInviteUser(e.target.value)}
          />
          <button onClick={handleInvite}>Invite</button>
        </section>

        {/* Recovery */}
        <section className="admin-section">
          <h2>Key Recovery</h2>
          <input type="file" onChange={handleUploadBackup} />
          <button onClick={handleRecoveryKit}>Generate Recovery Kit</button>
        </section>
      </div>
    </div>
  );
}