import { describe, expect, it } from "vitest";
import { ApiRequestError, errorMessage } from "../src/lib/api/client";
import { plural } from "../src/lib/format";

describe("plural", () => {
  it("counts with the right noun", () => {
    expect(plural(0, "person", "people")).toBe("0 people");
    expect(plural(1, "person", "people")).toBe("1 person");
    expect(plural(3, "talk", "talks")).toBe("3 talks");
  });
});

describe("errorMessage", () => {
  it("uses the api's own message when it sent one, and the fallback for anything else", () => {
    expect(errorMessage(new ApiRequestError(404, "not_found", "Contact not found"), "fallback")).toBe("Contact not found");
    expect(errorMessage(new Error("socket hang up"), "We could not reach the service.")).toBe("We could not reach the service.");
    expect(errorMessage("weird", "fallback")).toBe("fallback");
    expect(errorMessage(undefined, "fallback")).toBe("fallback");
  });
});
