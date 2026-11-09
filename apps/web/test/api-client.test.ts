import { MeResponse } from "@confy/shared/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, api } from "../src/lib/api/client";
import { apiBaseUrl } from "../src/lib/api/config";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("apiBaseUrl", () => {
  it("uses API_BASE_URL on the server, with a local default", () => {
    vi.stubEnv("API_BASE_URL", "http://api:4000");
    expect(apiBaseUrl()).toBe("http://api:4000");
    vi.stubEnv("API_BASE_URL", "");
    delete process.env.API_BASE_URL;
    expect(apiBaseUrl()).toBe("http://localhost:4000");
  });

  it("uses the same-origin proxy in the browser", () => {
    vi.stubGlobal("window", {});
    expect(apiBaseUrl()).toBe("/api/proxy");
  });
});

describe("api client", () => {
  it("sends the persona header and validates the response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { userId: "demo-sam" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.get("/v1/me", MeResponse, { userId: "demo-sam" })).resolves.toEqual({ userId: "demo-sam" });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)["x-user-id"]).toBe("demo-sam");
  });

  it("defaults to the demo persona and sends JSON bodies on post", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { userId: "demo-alex" }));
    vi.stubGlobal("fetch", fetchMock);
    await api.post("/v1/me", MeResponse, { a: 1 });
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"a":1}');
    expect((init.headers as Record<string, string>)["x-user-id"]).toBe("demo-alex");
  });

  it("maps api error envelopes to ApiRequestError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(404, { error: { code: "not_found", message: "nope" } })));
    await expect(api.get("/v1/x", MeResponse)).rejects.toMatchObject({
      status: 404,
      code: "not_found",
      message: "nope",
    });
  });

  it("falls back to a generic error for non-envelope failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 502 })));
    const err = await api.get("/v1/x", MeResponse).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err).toMatchObject({ status: 502, code: "http_error" });
  });

  it("rejects responses that drift from the contract", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { userId: "BAD ID" })));
    await expect(api.get("/v1/me", MeResponse)).rejects.toThrow();
  });
});
