import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "@/pages/Index";

vi.mock("@/components/landing/DashboardDemoSection", () => ({
  DashboardDemoSection: () => (
    <div data-testid="dashboard-demo-section">
      <img alt="Invera mascot" src="/mascot/animation-8.png" className="absolute right-0" />
    </div>
  ),
}));

beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

const renderLanding = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <Index />
      </LanguageProvider>
    </MemoryRouter>
  );

describe("landing mascot decorations", () => {
  it("renders one split mascot per landing section with right-left alternating placement", async () => {
    renderLanding();

    await waitFor(() => {
      expect(screen.getAllByAltText("Invera mascot")).toHaveLength(8);
    });

    const mascotImages = screen.getAllByAltText("Invera mascot");
    expect(mascotImages.map((image) => image.getAttribute("src"))).toEqual([
      "/mascot/animation-1.png",
      "/mascot/animation-2.png",
      "/mascot/animation-3.png",
      "/mascot/animation-4.png",
      "/mascot/animation-8.png",
      "/mascot/animation-6.png",
      "/mascot/animation-7.png",
      "/mascot/animation-8.png",
    ]);
    expect(
      mascotImages.map((image) => {
        const className = image.getAttribute("class") ?? "";
        return /\b-?right-/.test(className) ? "right" : "left";
      })
    ).toEqual(["right", "left", "right", "left", "right", "left", "right", "left"]);
  });
});
