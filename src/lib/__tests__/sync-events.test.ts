import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getSyncSettleSnapshot, subscribeToSyncSettles } from "../sync-events"

describe("sync-events", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setup() {
    const client = new QueryClient()
    let notifications = 0
    const unsubscribe = subscribeToSyncSettles(client, () => {
      notifications += 1
    })
    return { client, unsubscribe, notifications: () => notifications }
  }

  it("starts idle with a stable snapshot ref", () => {
    const { client, unsubscribe } = setup()
    expect(getSyncSettleSnapshot(client).kind).toBeNull()
    expect(getSyncSettleSnapshot(client)).toBe(getSyncSettleSnapshot(client))
    unsubscribe()
  })

  it("records a query success settle, notifies, and decays to idle", async () => {
    const { client, unsubscribe, notifications } = setup()
    await client.fetchQuery({ queryKey: ["t"], queryFn: async () => 1, retry: false })
    expect(getSyncSettleSnapshot(client).kind).toBe("success")
    expect(notifications()).toBeGreaterThan(0)

    vi.advanceTimersByTime(1600)
    expect(getSyncSettleSnapshot(client).kind).toBeNull()
    unsubscribe()
  })

  it("records a query error settle with the error message", async () => {
    const { client, unsubscribe } = setup()
    await expect(
      client.fetchQuery({
        queryKey: ["t"],
        queryFn: async () => {
          throw new Error("boom")
        },
        retry: false,
      }),
    ).rejects.toThrow("boom")
    const snapshot = getSyncSettleSnapshot(client)
    expect(snapshot.kind).toBe("error")
    expect(snapshot.message).toBe("boom")
    unsubscribe()
  })

  it("a stale decay timer never clears a newer settle", async () => {
    const { client, unsubscribe } = setup()
    await client.fetchQuery({ queryKey: ["a"], queryFn: async () => 1, retry: false })
    expect(getSyncSettleSnapshot(client).kind).toBe("success")

    vi.advanceTimersByTime(1000)
    await expect(
      client.fetchQuery({
        queryKey: ["b"],
        queryFn: async () => {
          throw new Error("late")
        },
        retry: false,
      }),
    ).rejects.toThrow("late")
    expect(getSyncSettleSnapshot(client).kind).toBe("error")

    // The first timer fires here — the newer error flash must survive it.
    vi.advanceTimersByTime(1000)
    expect(getSyncSettleSnapshot(client).kind).toBe("error")

    vi.advanceTimersByTime(1000)
    expect(getSyncSettleSnapshot(client).kind).toBeNull()
    unsubscribe()
  })

  it("records a mutation error settle", async () => {
    const { client, unsubscribe } = setup()
    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => {
        throw new Error("nope")
      },
      retry: false,
    })
    await expect(mutation.execute(null)).rejects.toThrow("nope")
    const snapshot = getSyncSettleSnapshot(client)
    expect(snapshot.kind).toBe("error")
    expect(snapshot.message).toBe("nope")
    unsubscribe()
  })
})
