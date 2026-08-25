import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../lib/api/auth.js";
import { useAuth } from "../lib/auth/context.js";

export default function LoginPage() {
  const [email, setEmail] = useState("participant@example.com");
  const [password, setPassword] = useState("Bootcamp1!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      await refreshUser();
      navigate("/rooms");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div data-testid="login-page" style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Boot Camp Starter</h1>
        <p style={styles.subtitle}>Sign in to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              data-testid="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
            />
          </label>
          {error && (
            <p data-testid="login-error" style={styles.error}>
              {error}
            </p>
          )}
          <button data-testid="login-submit" type="submit" disabled={loading} style={styles.button}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  card: { background: "#fff", borderRadius: 12, padding: "2rem 2.5rem", boxShadow: "0 4px 24px rgba(0,0,0,.08)", width: "100%", maxWidth: 400 },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 700 },
  subtitle: { margin: "0.25rem 0 1.5rem", color: "#64748b" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem", fontWeight: 500 },
  input: { padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "1rem" },
  error: { color: "#dc2626", margin: 0, fontSize: "0.875rem" },
  button: { padding: "0.65rem", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 600, fontSize: "1rem" },
};
