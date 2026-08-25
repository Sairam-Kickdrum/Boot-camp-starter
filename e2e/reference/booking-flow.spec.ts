/**
 * Reference E2E tests — booking flow (golden path + conflict scenario).
 *
 * These tests drive a real Chromium browser through the user journey and
 * are the single source of truth that the whole stack is wired up correctly.
 * Run them after any change touching auth, rooms, bookings, or the DB schema.
 *
 * Prerequisites (must both be running):
 *   npm run dev          — starts the API (port 3000) and web (port 5173)
 *   Docker postgres      — seeded with test users and 5 rooms
 *
 * The global setup (e2e/global-setup.ts) clears the bookings table before
 * the suite runs, so tests are idempotent across re-runs.
 *
 * Run:
 *   npm run test:e2e             — headless (CI mode)
 *   npx playwright test --headed — watch it run in a browser window
 */

import { test, expect, type Page } from "@playwright/test";

const TEST_EMAIL = "participant@example.com";
const TEST_PASSWORD = "Bootcamp1!";

/** Log in and land on /rooms. Shared setup used by both test blocks. */
async function login(page: Page) {
  await page.goto("/login");
  await expect(page.getByTestId("login-page")).toBeVisible();
  await page.getByTestId("email-input").fill(TEST_EMAIL);
  await page.getByTestId("password-input").fill(TEST_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL("**/rooms");
  await expect(page.getByTestId("rooms-page")).toBeVisible();
}

test.describe("Reference booking flow", () => {
  test("user can log in, browse rooms, book a room, and see the booking", async ({ page }) => {

    // ── Step 1: Login ────────────────────────────────────────────────────────
    // Navigate to /login and verify the login form is rendered.
    // Fill in the seeded test credentials and submit.
    // On success the API calls Cognito (InitiateAuth), stores the AccessToken
    // in an httpOnly "session" cookie, and the frontend redirects to /rooms.
    await login(page);

    // ── Step 2: Rooms list ───────────────────────────────────────────────────
    // The page fetches GET /rooms (authenticated via the session cookie)
    // and renders a card for each of the 5 seeded rooms.
    // We click the "Book this room" link on the first card.
    const firstBookLink = page.getByTestId("book-room-link").first();
    await expect(firstBookLink).toBeVisible();
    await firstBookLink.click();

    // ── Step 3: Booking form ─────────────────────────────────────────────────
    // The booking page renders a form with check-in and check-out date inputs.
    // We pick tomorrow and the day after — always in the future so the
    // availability check passes regardless of when the test runs.
    // (The global setup clears bookings before the suite, so these dates are
    // always available at the start of a test run.)
    await expect(page.getByTestId("booking-page")).toBeVisible();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const fmt = (d: Date) => d.toISOString().split("T")[0]!;
    await page.getByTestId("check-in-input").fill(fmt(tomorrow));
    await page.getByTestId("check-out-input").fill(fmt(dayAfter));
    await page.getByTestId("confirm-booking-btn").click();

    // ── Step 4: Confirmation ─────────────────────────────────────────────────
    // The API returns 201 with the created booking.
    // The frontend replaces the form with a confirmation message.
    await expect(page.getByTestId("booking-confirmed")).toBeVisible();

    // ── Step 5: My bookings ──────────────────────────────────────────────────
    // Clicking "View my bookings" navigates to /bookings.
    // The page fetches GET /bookings, which returns only the current user's
    // bookings (ownership enforced by the API).
    // We assert that the first row has status "confirmed".
    await page.getByRole("button", { name: "View my bookings" }).click();
    await expect(page.getByTestId("bookings-page")).toBeVisible();
    await expect(page.getByTestId("booking-row").first()).toBeVisible();
    await expect(page.getByTestId("booking-status").first()).toHaveText("confirmed");
  });
});

test.describe("Booking conflict", () => {
  test("shows an error when the selected dates are already booked", async ({ page }) => {

    // ── Step 1: Login ────────────────────────────────────────────────────────
    await login(page);

    // ── Step 2: Identify the first room ──────────────────────────────────────
    // Extract the room ID from the first "Book this room" link href.
    // The href has the shape /rooms/:id/book.
    const firstBookLink = page.getByTestId("book-room-link").first();
    await expect(firstBookLink).toBeVisible();
    const href = await firstBookLink.getAttribute("href");
    const roomId = href!.split("/")[2]!;

    // ── Step 3: Pre-book the room via API ────────────────────────────────────
    // Use page.request (shares the session cookie with the page context) to
    // create a booking directly through the API for far-future dates.
    // Dynamic: always 10+ years ahead so the dates never become "past" and the
    // global setup's DELETE FROM bookings keeps each run clean.
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);
    const conflictCheckIn = farFuture.toISOString().split("T")[0]!;
    farFuture.setDate(farFuture.getDate() + 5);
    const conflictCheckOut = farFuture.toISOString().split("T")[0]!;

    const setupRes = await page.request.post("/api/bookings", {
      data: { roomId, checkIn: conflictCheckIn, checkOut: conflictCheckOut },
    });
    expect(setupRes.status()).toBe(201); // confirm the setup booking was created

    // ── Step 4: Navigate to the booking form ─────────────────────────────────
    await page.goto(`/rooms/${roomId}/book`);
    await expect(page.getByTestId("booking-page")).toBeVisible();

    // ── Step 5: Submit overlapping dates via the UI ───────────────────────────
    // Use dates that fully overlap the pre-booked range.
    // The API will return 409 Conflict.
    await page.getByTestId("check-in-input").fill(conflictCheckIn);
    await page.getByTestId("check-out-input").fill(conflictCheckOut);
    await page.getByTestId("confirm-booking-btn").click();

    // ── Step 6: Error message is shown ───────────────────────────────────────
    // BookingPage.tsx catches the ApiError and renders it in the
    // data-testid="booking-error" element. The API message is
    // "Room is not available for the requested dates".
    await expect(page.getByTestId("booking-error")).toBeVisible();
    await expect(page.getByTestId("booking-error")).toContainText("not available");

    // The form must remain visible so the user can pick different dates.
    await expect(page.getByTestId("booking-page")).toBeVisible();
    await expect(page.getByTestId("confirm-booking-btn")).toBeVisible();
  });
});
