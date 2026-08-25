import { useState, useEffect, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Room } from "@boot-camp/shared-types";
import { getRoom } from "../lib/api/rooms.js";
import { createBooking } from "../lib/api/bookings.js";
import Nav from "../components/Nav.js";

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (id) {
      getRoom(id).then(setRoom).catch(() => navigate("/rooms"));
    }
  }, [id, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !checkIn || !checkOut) return;
    setError(null);
    setLoading(true);
    try {
      await createBooking({ roomId: id, checkIn, checkOut });
      setConfirmed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Booking failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!room) return <><Nav /><p data-testid="booking-loading" style={{ padding: 32 }}>Loading…</p></>;

  if (confirmed) {
    return (
      <>
        <Nav />
        <main data-testid="booking-confirmed" style={styles.main}>
          <div style={styles.card}>
            <h1 style={{ color: "#16a34a" }}>Booking confirmed!</h1>
            <p>You've booked <strong>{room.name}</strong> from {checkIn} to {checkOut}.</p>
            <button onClick={() => navigate("/bookings")} style={styles.btn}>View my bookings</button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main data-testid="booking-page" style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Book {room.name}</h1>
          <p style={styles.price}>${(room.pricePerNightCents / 100).toFixed(2)}/night · Capacity: {room.capacity}</p>
          <form onSubmit={handleSubmit} style={styles.form}>
            <label style={styles.label}>
              Check-in date
              <input
                data-testid="check-in-input"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Check-out date
              <input
                data-testid="check-out-input"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
                min={checkIn || new Date().toISOString().split("T")[0]}
                style={styles.input}
              />
            </label>
            {error && <p data-testid="booking-error" style={styles.error}>{error}</p>}
            <button data-testid="confirm-booking-btn" type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Booking…" : "Confirm booking"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { padding: "2rem 1.5rem", maxWidth: 480, margin: "0 auto" },
  card: { background: "#fff", borderRadius: 12, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  heading: { margin: "0 0 0.25rem", fontSize: "1.3rem" },
  price: { margin: "0 0 1.5rem", color: "#64748b" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: 500, fontSize: "0.9rem" },
  input: { padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "1rem" },
  error: { color: "#dc2626", margin: 0, fontSize: "0.875rem" },
  btn: { padding: "0.65rem", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", fontWeight: 600, fontSize: "1rem" },
};
