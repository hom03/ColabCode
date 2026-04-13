import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import "../styles/admin.css";

export default function AdminPage() {
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user"));

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/login");
  }, [user, navigate]);

  const [activeUsers, setActiveUsers] = useState([]);
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

  // --- Helper Functions ---
  const formatDate = (date) =>
    date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const registerActiveUser = (user) => {
    const users = JSON.parse(localStorage.getItem("activeUsers") || "[]");
    const filtered = users.filter((u) => u.username !== user.username);
    const updated = [...filtered, { ...user, lastSeen: Date.now() }];
    localStorage.setItem("activeUsers", JSON.stringify(updated));
    setActiveUsers(updated);
  };

  const removeStaleUsers = () => {
    const now = Date.now();
    const users = JSON.parse(localStorage.getItem("activeUsers") || "[]");
    const filtered = users.filter(u => now - u.lastSeen < 60000); // 1 min
    localStorage.setItem("activeUsers", JSON.stringify(filtered));
    setActiveUsers(filtered);
  };

  // --- E2EE / Key Functions ---
  const handleToggleE2EE = () => {
    const newValue = !e2eeEnabled;
    const now = new Date();
    setE2eeEnabled(newValue);
    setLastChanged(now);
    localStorage.setItem("e2eeEnabled", JSON.stringify(newValue));
    localStorage.setItem("e2eeLastChanged", now.toISOString());
    window.dispatchEvent(new StorageEvent("storage", {
      key: "e2eeToggle",
      newValue: JSON.stringify({ enabled: newValue, time: now.toISOString() }),
    }));
  };

  const handleRotateKeys = () => {
    const newVersion = keyVersion + 1;
    const now = new Date();
    setKeyVersion(newVersion);
    setLastChanged(now);
    localStorage.setItem("keyVersion", newVersion);
    localStorage.setItem("e2eeLastChanged", now.toISOString());
    window.dispatchEvent(new StorageEvent("storage", {
      key: "keyRotation",
      newValue: JSON.stringify({ version: newVersion, time: now.toISOString() }),
    }));
  };

  // --- Collaborator Management ---
  const handleInvite = () => {
    if (!inviteUser) return alert("Enter a username/email first");

    const collaborators = JSON.parse(localStorage.getItem("collaborators") || "[]");
    const filtered = collaborators.filter(c => c.username !== inviteUser);

    filtered.push({ username: inviteUser, role: "User", lastSeen: Date.now() });
    localStorage.setItem("collaborators", JSON.stringify(filtered));

    const active = JSON.parse(localStorage.getItem("activeUsers") || "[]");
    const filteredActive = active.filter(u => u.username !== inviteUser);
    filteredActive.push({ username: inviteUser, role: "User", lastSeen: Date.now() });
    localStorage.setItem("activeUsers", JSON.stringify(filteredActive));

    setInviteUser("");
    alert(`${inviteUser} invited successfully!`);
  };

  const handleRemoveCollaborator = (username) => {
    if (!window.confirm(`Remove ${username} completely?`)) return;

    const collaborators = JSON.parse(localStorage.getItem("collaborators") || "[]")
      .filter(u => u.username !== username);
    localStorage.setItem("collaborators", JSON.stringify(collaborators));

    const active = JSON.parse(localStorage.getItem("activeUsers") || "[]")
      .filter(u => u.username !== username);
    localStorage.setItem("activeUsers", JSON.stringify(active));
    setActiveUsers(active);

    alert(`${username} removed completely`);
  };

  const handleChangeRole = (username, newRole) => {
    const collaborators = JSON.parse(localStorage.getItem("collaborators") || "[]")
      .map(u => u.username === username ? { ...u, role: newRole } : u);
    localStorage.setItem("collaborators", JSON.stringify(collaborators));
    setActiveUsers(prev => prev.map(u => u.username === username ? { ...u, role: newRole } : u));
    alert(`${username} is now ${newRole}`);
  };

  // --- Keys / Recovery ---
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

  const handleFingerprint = () => alert(`${publicKey}-FINGERPRINT-${keyVersion}`);

  const handleUploadBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = JSON.parse(reader.result);
      setPrivateKey(data.privateKey);
      localStorage.setItem("privateKey", data.privateKey);
      alert("Private key restored from backup");
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

  // --- Effects ---
  useEffect(() => {
    if (!user) return;

    registerActiveUser(user);
    const heartbeat = setInterval(() => {
      registerActiveUser(user);
      removeStaleUsers();
    }, 2000);

    const handleStorageEvent = (e) => {
      if (!e.key) return;
      if (e.key === "activeUsers") setActiveUsers(JSON.parse(localStorage.getItem("activeUsers") || "[]"));
      if (e.key === "e2eeToggle" && e.newValue) {
        const data = JSON.parse(e.newValue);
        setE2eeEnabled(data.enabled);
        setLastChanged(new Date(data.time));
      }
      if (e.key === "keyRotation" && e.newValue) {
        const data = JSON.parse(e.newValue);
        setKeyVersion(data.version);
        setLastChanged(new Date(data.time));
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  return (
    <div className="admin-container">
      <TopBar user={user} />
      <div className="admin-main">
        <h1>Admin Dashboard</h1>

        {/* E2EE Section */}
        <section className="admin-section">
          <h2>End-to-End Encryption</h2>
          <div className="e2ee-status-row">
            <span>E2EE Status: <strong>{e2eeEnabled ? "Enabled" : "Disabled"}</strong></span>
            <label className="switch">
              <input type="checkbox" checked={e2eeEnabled} onChange={handleToggleE2EE} />
              <span className="slider"></span>
            </label>
          </div>
          <div className="e2ee-info">
            <p>Current Encryption Scope:</p><strong>Project Level</strong>
            <p>Last Status Change:</p><strong>{formatDate(lastChanged)}</strong>
          </div>
          <hr />
          <h3>Ownership & Metadata</h3>
          <div className="e2ee-info">
            <p>Owner: <strong>{user?.username}</strong></p>
            <p>Public Key Fingerprint: <strong>AB:CD:EF:12:34</strong></p>
            <p>Key Version:</p><strong>v{keyVersion}</strong>
          </div>
          <div className="e2ee-controls">
            <button onClick={handleExportPublicKey}>Export Public Key</button>
            <button onClick={handleDownloadPrivate}>Download Encrypted Private Key Backup</button>
            <button onClick={handleFingerprint}>View Full Fingerprint</button>
          </div>
        </section>

        {/* Key Rotation */}
        <section className="admin-section key-rotation-section">
          <h2>Key Rotation</h2>
          <p>Rotate keys to invalidate previously shared keys</p>
          <p><strong>IMPORTANT:</strong> All Collaborators will need to reauthorise after rotation.</p>
          <button onClick={handleRotateKeys}>Rotate Keys</button>
        </section>

        {/* Invite Collaborator */}
        <section className="admin-section collaborator-invite-section">
          <h2>Invite Collaborator</h2>
          <textarea
            placeholder="Enter collaborator email"
            value={inviteUser}
            onChange={(e) => setInviteUser(e.target.value)}
          />
          <div className="invite-options">
            <label><input type="radio" name="key-exchange" defaultChecked /> Auto key exchange</label>
            <label><input type="radio" name="key-exchange" /> Manual public key upload</label>
          </div>
          <button onClick={handleInvite}>Send Secure Invite</button>
          <p>Collaborators without valid keys receive read-only privileges until verified</p>
        </section>

        {/* Collaborator / Active Users */}
        <section className="admin-section collaborator-list-section">
          <h2>Collaborators / Active Users</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Last Seen</th><th>Control</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u, i) => (
                <tr key={i}>
                  <td>{u.username}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        const updatedUsers = activeUsers.map(userObj =>
                          userObj.username === u.username
                            ? { ...userObj, role: newRole }
                            : userObj
                        );
                        setActiveUsers(updatedUsers);

                        const collaborators = JSON.parse(localStorage.getItem("collaborators") || "[]");
                        const updatedCollabs = collaborators.map(c =>
                          c.username === u.username ? { ...c, role: newRole } : c
                        );
                        localStorage.setItem("collaborators", JSON.stringify(updatedCollabs));

                        alert(`${u.username} role changed to ${newRole}`);
                      }}
                      disabled={u.username === user.username}
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </td>
                  <td>{formatDate(new Date(u.lastSeen))}</td>
                  <td>
                    {u.username !== user.username && (
                      <button onClick={() => {
                        const filtered = activeUsers.filter(userObj => userObj.username !== u.username);
                        localStorage.setItem("activeUsers", JSON.stringify(filtered));
                        setActiveUsers(filtered);
                      }}>Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Key Recovery */}
        <section className="admin-section key-recovery-section">
          <h2>Key Recovery</h2>
          <label className="upload-button">
            Upload Key Backup
            <input type="file" style={{ display: "none" }} onChange={handleUploadBackup} />
          </label>
          <button onClick={handleRecoveryKit}>Generate Recovery Kit</button>
          <p>Recovery kits allow restoring encryption if admin key is lost</p>
        </section>
      </div>
    </div>
  );
}