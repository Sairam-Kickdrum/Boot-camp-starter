import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { Room } from "@boot-camp/shared-types";
import { listRooms } from "../lib/api/rooms.js";
import Nav from "../components/Nav.js";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRooms()
      .then((r) => setRooms(r.rooms))
      .catch(() => setError("Failed to load rooms."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Nav />
      <main data-testid="rooms-page" style={styles.main}>
        <h1 style={styles.heading}>Available Rooms</h1>
        {loading && <p>Loading rooms…</p>}
        {error && <p style={styles.error}>{error}</p>}
        <div style={styles.grid}>
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </main>
    </>
  );
}

function RoomCard({ room }: { room: Room }) {
  const price = (room.pricePerNightCents / 100).toFixed(2);
  return (
    <div data-testid="room-card" style={styles.card}>
      {room.imageUrl && (
        <img src={room.imageUrl} alt={room.name} style={styles.image} />
      )}
      <div style={styles.cardBody}>
        <h2 style={styles.roomName}>{room.name}</h2>
        <p style={styles.desc}>{room.description}</p>
        <div style={styles.meta}>
          <span>Capacity: {room.capacity}</span>
          <span>${price}/night</span>
        </div>
        <Link
          to={`/rooms/${room.id}/book`}
          data-testid="book-room-link"
          style={styles.bookBtn}
        >
          Book this room
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { padding: "2rem 1.5rem", maxWidth: 1100, margin: "0 auto" },
  heading: { marginBottom: "1.5rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" },
  card: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  image: { width: "100%", height: 180, objectFit: "cover" },
  cardBody: { padding: "1rem" },
  roomName: { margin: "0 0 0.25rem", fontSize: "1.1rem", fontWeight: 600 },
  desc: { margin: "0 0 0.75rem", color: "#64748b", fontSize: "0.9rem" },
  meta: { display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontSize: "0.875rem", color: "#475569" },
  bookBtn: { display: "block", textAlign: "center", background: "#2563eb", color: "#fff", padding: "0.5rem", borderRadius: 8, textDecoration: "none", fontWeight: 600 },
  error: { color: "#dc2626" },
};
