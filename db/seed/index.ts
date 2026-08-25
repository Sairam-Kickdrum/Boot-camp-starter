import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { rooms, users } from "../schema/index.js";

const client = new pg.Client({
  connectionString: process.env["DATABASE_URL"] ?? "postgresql://bootcamp:bootcamp@localhost:5432/bootcamp",
});

await client.connect();
const db = drizzle(client);

console.log("Seeding database...");

await db.insert(rooms).values([
  {
    name: "Lakeside Studio",
    description: "Cozy studio with a view of the lake. Perfect for solo travelers.",
    pricePerNightCents: 8500,
    capacity: 1,
  },
  {
    name: "Garden Suite",
    description: "Bright suite opening onto a private garden.",
    pricePerNightCents: 12000,
    capacity: 2,
  },
  {
    name: "The Loft",
    description: "Open-plan loft with exposed brick and city views.",
    pricePerNightCents: 15000,
    capacity: 3,
  },
  {
    name: "Family Cottage",
    description: "Spacious cottage with a full kitchen and backyard.",
    pricePerNightCents: 22000,
    capacity: 5,
  },
  {
    name: "Penthouse",
    description: "Top-floor suite with panoramic views and private terrace.",
    pricePerNightCents: 45000,
    capacity: 4,
    imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  },
]).onConflictDoNothing();

console.log("Seeded 5 rooms.");

// Users are created without passwords — Cognito is the auth provider.
// Run scripts/seed-cognito.sh to create the matching Cognito users and link cognito_sub.
await db.insert(users).values([
  { email: "participant@example.com", displayName: "Test Participant", role: "user" },
  { email: "admin@example.com", displayName: "Test Admin", role: "admin" },
]).onConflictDoNothing();

console.log("Seeded 2 users.");
console.log("Done. Next: run ./scripts/seed-cognito.sh to link Cognito users.");

await client.end();
