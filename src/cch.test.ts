import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  computeCch,
  replaceCchPlaceholder,
  hasCchPlaceholder,
} from "./cch.ts"

describe("computeCch", () => {
  it("produces correct hash for empty string", async () => {
    assert.equal(await computeCch(""), "647ed")
  })

  it("produces correct hash for 'test'", async () => {
    assert.equal(await computeCch("test"), "36194")
  })

  it("produces correct hash for 'hello world'", async () => {
    assert.equal(await computeCch("hello world"), "1d360")
  })

  it("produces correct hash for billing header with sonnet model", async () => {
    const body = "cc_version=2.1.88.claude-sonnet-4-5; cc_entrypoint=cli; cch=00000;"
    assert.equal(await computeCch(body), "a28c8")
  })

  it("produces correct hash for billing header with opus model", async () => {
    const body = "cc_version=2.1.88.claude-opus-4-1; cc_entrypoint=cli; cch=00000;"
    assert.equal(await computeCch(body), "d0c67")
  })

  it("produces correct hash for JSON body", async () => {
    const body = JSON.stringify({ model: "claude-sonnet-4-5", messages: [] })
    assert.equal(await computeCch(body), "1b540")
  })

  it("returns consistent hash on repeated calls", async () => {
    const body = "deterministic input"
    const hash1 = await computeCch(body)
    const hash2 = await computeCch(body)
    assert.equal(hash1, hash2)
  })

  it("returns different hashes for different inputs", async () => {
    const hash1 = await computeCch("input-a")
    const hash2 = await computeCch("input-b")
    assert.notEqual(hash1, hash2)
  })

  it("output is always a 5-character lowercase hex string", async () => {
    const inputs = ["", "a", "test body", JSON.stringify({ x: 1 })]
    for (const input of inputs) {
      const hash = await computeCch(input)
      assert.match(hash, /^[0-9a-f]{5}$/, `input: ${JSON.stringify(input)}`)
    }
  })
})

describe("hasCchPlaceholder", () => {
  it("returns true for exact placeholder", () => {
    assert.equal(hasCchPlaceholder("cch=00000"), true)
  })

  it("returns true when placeholder is embedded in a string", () => {
    assert.equal(hasCchPlaceholder("prefix cch=00000 suffix"), true)
  })

  it("returns false for fewer than 5 zeros", () => {
    assert.equal(hasCchPlaceholder("cch=0000"), false)
    assert.equal(hasCchPlaceholder("cch="), false)
  })

  it("returns true for more than 5 zeros (contains substring)", () => {
    assert.equal(hasCchPlaceholder("cch=000000"), true)
  })

  it("returns false for uppercase", () => {
    assert.equal(hasCchPlaceholder("CCH=00000"), false)
  })

  it("returns false for wrong digits", () => {
    assert.equal(hasCchPlaceholder("cch=12345"), false)
  })

  it("returns false for empty string", () => {
    assert.equal(hasCchPlaceholder(""), false)
  })

  it("returns false for unrelated strings", () => {
    assert.equal(hasCchPlaceholder('{"key":"value"}'), false)
  })
})

describe("replaceCchPlaceholder", () => {
  it("replaces the placeholder with a cch value", () => {
    const body = '{"request":"data","cch=00000"}'
    assert.equal(replaceCchPlaceholder(body, "abc12"), '{"request":"data","cch=abc12"}')
  })

  it("replaces only the first occurrence", () => {
    const body = "a cch=00000 b cch=00000 c"
    assert.equal(replaceCchPlaceholder(body, "abc12"), "a cch=abc12 b cch=00000 c")
  })

  it("returns original body when no placeholder exists", () => {
    const body = '{"request":"data"}'
    assert.equal(replaceCchPlaceholder(body, "abc12"), body)
  })

  it("does not mutate the original string", () => {
    const body = "cch=00000"
    const copy = body
    replaceCchPlaceholder(body, "abc12")
    assert.equal(body, copy)
  })
})
