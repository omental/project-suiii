import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { TodayDashboard } from "@/components/TodayDashboard";
import { resetLocalStateForTests } from "@/lib/localState";

describe("TodayDashboard", () => {
  beforeEach(() => {
    resetLocalStateForTests();
  });

  it("renders the Today dashboard and transformation values", () => {
    render(<TodayDashboard />);

    expect(screen.getByRole("heading", { name: /good morning, mubasshir/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /project suiii/i })).toBeInTheDocument();
    expect(screen.getByText(/79.0 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/73-74 kg/i)).toBeInTheDocument();
    expect(screen.getByText(/38.5 in/i)).toBeInTheDocument();
    expect(screen.getByText(/35 in/i)).toBeInTheDocument();
  });

  it("opens and closes the weighing interface", async () => {
    const user = userEvent.setup();
    render(<TodayDashboard />);

    await user.click(screen.getByRole("button", { name: /start weighing/i }));
    expect(screen.getByRole("dialog", { name: /pre-badminton fuel/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("dialog", { name: /pre-badminton fuel/i })).not.toBeInTheDocument();
  });

  it("enters an actual banana weight, completes the meal action, and persists locally", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TodayDashboard />);

    await user.click(screen.getByRole("button", { name: /start weighing/i }));
    await user.type(screen.getByLabelText(/actual measured grams/i), "118");
    await user.click(screen.getByRole("button", { name: /mark complete/i }));

    expect(screen.getByText(/banana 118 g logged locally/i)).toBeInTheDocument();
    unmount();

    render(<TodayDashboard />);
    expect(await screen.findByText(/banana 118 g logged locally/i)).toBeInTheDocument();
  });

  it("increments and undoes water", async () => {
    const user = userEvent.setup();
    render(<TodayDashboard />);

    expect(screen.getByText(/Water: 1.8 of 3.0 L/i)).toBeInTheDocument();
    const waterControl = screen.getByRole("group", { name: /water quick actions/i });
    await user.click(within(waterControl).getByRole("button", { name: /\+250 ml/i }));
    expect(screen.getByText(/Water: 2.0 of 3.0 L/i)).toBeInTheDocument();
    await user.click(within(waterControl).getByRole("button", { name: /undo/i }));
    expect(screen.getByText(/Water: 1.8 of 3.0 L/i)).toBeInTheDocument();
  });

  it("increments and undoes cigarettes while preventing negative values", async () => {
    const user = userEvent.setup();
    render(<TodayDashboard />);

    const cigaretteControl = screen.getByRole("group", { name: /cigarettes quick actions/i });
    const undo = within(cigaretteControl).getByRole("button", { name: /undo/i });
    expect(undo).toBeDisabled();

    await user.click(within(cigaretteControl).getByRole("button", { name: /\+1/i }));
    expect(screen.getByText(/Cigarettes: 7 of 12/i)).toBeInTheDocument();
    await user.click(undo);
    expect(screen.getByText(/Cigarettes: 6 of 12/i)).toBeInTheDocument();
    expect(undo).toBeDisabled();
  });

  it("opens and closes the workout preview dialog", async () => {
    const user = userEvent.setup();
    render(<TodayDashboard />);

    await user.click(screen.getByRole("button", { name: /start workout/i }));
    expect(screen.getByRole("dialog", { name: /full body a/i })).toBeInTheDocument();
    expect(screen.getByText(/the guided workout player arrives in phase 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByRole("dialog", { name: /full body a/i })).not.toBeInTheDocument();
  });
});
