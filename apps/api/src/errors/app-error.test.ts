import { describe, it, expect } from "vitest";
import {
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
} from "./app-error.js";

describe("NotFoundError", () => {
  it("sets 404 status and NOT_FOUND code", () => {
    const err = new NotFoundError("Room");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("formats message without id", () => {
    expect(new NotFoundError("Room").message).toBe("Room not found");
  });

  it("formats message with id", () => {
    expect(new NotFoundError("Room", "abc-123").message).toBe("Room 'abc-123' not found");
  });
});

describe("ConflictError", () => {
  it("sets 409 status and CONFLICT code", () => {
    const err = new ConflictError("already booked");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("already booked");
  });
});

describe("UnauthorizedError", () => {
  it("sets 401 status and defaults message to Unauthorized", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts a custom message", () => {
    expect(new UnauthorizedError("No session cookie").message).toBe("No session cookie");
  });
});

describe("ForbiddenError", () => {
  it("sets 403 status and defaults message to Forbidden", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("Forbidden");
  });
});

describe("ValidationError", () => {
  it("sets 400 status and VALIDATION_ERROR code", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("invalid input");
  });
});
