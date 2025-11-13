import { useState, type FormEvent } from "react";
import { useAdmin } from "../../context/AdminContext";
import "./AdminLogin.css";

export function AdminLogin() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAdmin();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(token);
      if (!success) {
        setError("Invalid admin token");
      }
    } catch (err) {
      setError("Login failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-box">
        <div className="admin-login-header">
          <h1>Admin Dashboard</h1>
          <p>Enter your admin token to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="token">Admin Token</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter admin token"
              autoFocus
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || !token.trim()}>
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>

        <div className="admin-login-footer">
          <a href="/">← Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
