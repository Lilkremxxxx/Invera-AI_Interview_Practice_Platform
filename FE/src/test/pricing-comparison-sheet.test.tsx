import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PricingComparisonSheet } from "../components/pricing/PricingComparisonSheet";

describe("PricingComparisonSheet", () => {
  it("renders the spreadsheet-style comparison labels in English", () => {
    render(
      <PricingComparisonSheet
        language="en"
        mode="upgrade"
        onSelectPlan={() => undefined}
      />,
    );

    expect(screen.getByText("Features")).toBeInTheDocument();
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Basic").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Premium").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Price / month").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sessions / month").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tokens / session").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /choose pro/i }).length).toBeGreaterThan(0);
  });
});
