import { describe, expect, it, vi, beforeEach } from "vitest";
import { sessionsApi } from "@/lib/api";

describe("sessionsApi export helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });
  });

  it("requests the DOCX export endpoint for a single session", async () => {
    const blob = new Blob(["docx"], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const response = new Response(blob, {
      status: 200,
      headers: {
        "content-disposition": 'attachment; filename="invera-session-frontend-1234.docx"',
      },
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(response as Response);

    const result = await sessionsApi.downloadDocx("session-123");

    expect(fetchSpy).toHaveBeenCalledWith("/api/sessions/session-123/export-docx", expect.any(Object));
    expect(result.filename).toBe("invera-session-frontend-1234.docx");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.size).toBeGreaterThan(0);
  });
});
