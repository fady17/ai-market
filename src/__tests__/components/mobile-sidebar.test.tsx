// MobileSidebar.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import MobileSidebar from "@/components/mobile-sidebar";

describe("MobileSidebar Component", () => {
  it("renders the MobileSidebar component", () => {
    render(<MobileSidebar />);

    // Check for the presence of the Menu icon
    expect(screen.getByRole("button")).toBeInTheDocument();

    // Check for the presence of the Navigation Menu (SheetTitle)
    expect(screen.getByText("Navigation Menu")).toBeInTheDocument();
  });
});
