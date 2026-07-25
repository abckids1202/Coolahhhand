import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the privacy-first landing experience", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /nexus field/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/private by design/i)).toBeInTheDocument();
  });

  it("starts pointer mode without requesting a camera", () => {
    render(<App />);
    fireEvent.click(
      screen.getByRole("button", { name: /continue with pointer/i }),
    );
    expect(screen.getByText("POINTER INPUT")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });
});
