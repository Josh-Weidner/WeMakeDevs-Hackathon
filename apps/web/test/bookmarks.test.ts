import { describe, expect, it } from "vitest";
import { addBookmark, bookmarksKey, parseBookmarks } from "../src/lib/bookmarks";

describe("bookmarks", () => {
  it("keeps each persona's list under its own key", () => {
    expect(bookmarksKey("demo-alex")).toBe("confy:bookmarks:demo-alex");
    expect(bookmarksKey("demo-sam")).not.toBe(bookmarksKey("demo-alex"));
  });

  it("reads a stored list defensively", () => {
    expect(parseBookmarks('["talk-1","talk-2"]')).toEqual(["talk-1", "talk-2"]);
    expect(parseBookmarks('["talk-1", 7, null, {"a":1}]')).toEqual(["talk-1"]);
    for (const bad of [null, undefined, "", "not json", '{"a":1}', "42", '"talk-1"']) expect(parseBookmarks(bad)).toEqual([]);
  });

  it("adds an id once and keeps the order, without mutating the input", () => {
    const ids = ["talk-1"];
    expect(addBookmark(ids, "talk-2")).toEqual(["talk-1", "talk-2"]);
    expect(addBookmark(["talk-1", "talk-2"], "talk-1")).toEqual(["talk-1", "talk-2"]);
    expect(ids).toEqual(["talk-1"]);
  });
});
