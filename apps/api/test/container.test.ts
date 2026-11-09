import { afterEach, describe, expect, it } from "vitest";
import { apiEnv, loadConfig } from "../src/config.js";
import { createContainer } from "../src/container.js";
import { AppError, NotFoundError, UpstreamError, ValidationError } from "../src/errors.js";

const required = {
  ELASTICSEARCH_URL: "https://example.es.io:443",
  ELASTICSEARCH_API_KEY: "key",
  OPENAI_API_KEY: "sk-test",
};
const saved = { ...process.env };

afterEach(() => {
  process.env = { ...saved };
});

describe("config and container", () => {
  it("applies defaults", () => {
    expect(apiEnv.parse(required)).toMatchObject({ PORT: 4000, HOST: "0.0.0.0" });
  });

  it("loads config from process.env and builds a container", async () => {
    Object.assign(process.env, required);
    const container = createContainer(loadConfig());
    expect(container.services.health).toBeDefined();
    await container.close();
  });
});

describe("domain errors", () => {
  it("carry code and status", () => {
    expect(new ValidationError("x")).toMatchObject({ code: "validation_error", statusCode: 400 });
    expect(new NotFoundError("x")).toMatchObject({ code: "not_found", statusCode: 404 });
    expect(new UpstreamError("x")).toMatchObject({ code: "upstream_error", statusCode: 502 });
    expect(new UpstreamError("x")).toBeInstanceOf(AppError);
  });
});
