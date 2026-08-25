import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth/context.js";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <nav style={styles.nav}>
      <Link to="/rooms" style={styles.brand}>Boot Camp Starter</Link>
      <div style={styles.links}>
        <Link to="/rooms" style={styles.link}>Rooms</Link>
        <Link to="/bookings" style={styles.link}>My Bookings</Link>
        <span style={styles.email}>{user?.email}</span>
        <button onClick={handleLogout} style={styles.logout}>Log out</button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", background: "#fff", borderBottom: "1px solid #e2e8f0" },
  brand: { fontWeight: 700, fontSize: "1.1rem", textDecoration: "none" },
  links: { display: "flex", alignItems: "center", gap: "1rem" },
  link: { textDecoration: "none", color: "#2563eb", fontWeight: 500 },
  email: { color: "#64748b", fontSize: "0.875rem" },
  logout: { background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.25rem 0.75rem", color: "#64748b" },
};
