import { useState, useEffect } from "react";
import type { Booking } from "@boot-camp/shared-types";
import { listBookings } from "../lib/api/bookings.js";
import Nav from "../components/Nav.js";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBookings()
      .then((r) => setBookings(r.bookings))
      .catch(() => setError("Failed to load bookings."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Nav />
      <main data-testid="bookings-page" style={styles.main}>
        <h1 style={styles.heading}>My Bookings</h1>
        {loading && <p>Loading…</p>}
        {error && <p style={styles.error}>{error}</p>}
        {!loading && bookings.length === 0 && (
          <p style={styles.empty}>No bookings yet.</p>
        )}
        <div style={styles.list}>
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      </main>
    </>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  return (
    <div data-testid="booking-row" style={styles.row}>
      <div style={styles.rowMain}>
        <span style={styles.dates}>{booking.checkIn} → {booking.checkOut}</span>
        <span
          data-testid="booking-status"
          style={{ ...styles.badge, background: booking.status === "confirmed" ? "#dcfce7" : "#fee2e2", color: booking.status === "confirmed" ? "#166534" : "#991b1b" }}
        >
          {booking.status}
        </span>
      </div>
      <span style={styles.meta}>Booking ID: {booking.id.slice(0, 8)}…</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { padding: "2rem 1.5rem", maxWidth: 700, margin: "0 auto" },
  heading: { marginBottom: "1.5rem" },
  list: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  row: { background: "#fff", borderRadius: 10, padding: "1rem 1.25rem", boxShadow: "0 1px 6px rgba(0,0,0,.05)" },
  rowMain: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" },
  dates: { fontWeight: 600 },
  badge: { padding: "0.2rem 0.6rem", borderRadius: 999, fontSize: "0.8rem", fontWeight: 600 },
  meta: { fontSize: "0.8rem", color: "#94a3b8" },
  error: { color: "#dc2626" },
  empty: { color: "#64748b" },
};
