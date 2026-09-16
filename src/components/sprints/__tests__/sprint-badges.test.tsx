// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SprintCountdownBadge } from "@/components/sprints/sprint-countdown-badge";
import { TaskSprintSelector } from "@/components/sprints/task-sprint-selector";
import { ValueBadge } from "@/components/app/value-badge";
import type { UserStory } from "@/lib/api/types";

function story(tags: [string, string | null][]): UserStory {
  return { id: 1, ref: 42, tags } as UserStory;
}

describe("SprintCountdownBadge", () => {
  it("warns within 24h and names the rollover destination", () => {
    const finish = new Date(Date.now() + 13 * 60 * 60 * 1000).toISOString().slice(0, 10);
    render(
      <SprintCountdownBadge
        sprint={{ name: "Sprint 12", closed: false, estimated_finish: finish }}
        unfinishedCount={5}
        rolloverName="Sprint 13"
      />,
    );
    expect(screen.getByText(/5 unfinished → Sprint 13/)).toBeInTheDocument();
  });

  it("shows overdue past the deadline", () => {
    render(
      <SprintCountdownBadge
        sprint={{ name: "Sprint 11", closed: false, estimated_finish: "2020-01-01" }}
        unfinishedCount={2}
        rolloverName={null}
      />,
    );
    expect(screen.getByText(/Overdue/)).toBeInTheDocument();
    expect(screen.getByText(/2 unfinished → backlog/)).toBeInTheDocument();
  });

  it("shows closed without rollover text", () => {
    render(
      <SprintCountdownBadge
        sprint={{ name: "Sprint 10", closed: true, estimated_finish: "2020-01-01" }}
        unfinishedCount={3}
      />,
    );
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.queryByText(/unfinished/)).not.toBeInTheDocument();
  });
});

describe("ValueBadge", () => {  it("shows team value and cash", () => {
    render(<ValueBadge story={story([["50cook", null], ["100usd", null]])} />);
    expect(screen.getByText(/50/)).toBeInTheDocument();
    expect(screen.getByTitle(/50 cook.*100 usd/)).toBeInTheDocument();
  });

  it("flags missing value", () => {
    render(<ValueBadge story={story([["frontend", null]])} />);
    expect(screen.getByText("No value")).toBeInTheDocument();
  });
});

describe("TaskSprintSelector", () => {
  const sprints = [
    { id: 7, name: "Sprint 1", closed: false },
    { id: 8, name: "Old sprint", closed: true },
  ];

  it("shows None when unassigned, never Backlog", () => {
    render(<TaskSprintSelector sprints={sprints} value={null} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("None");
    expect(screen.queryByText("Backlog")).not.toBeInTheDocument();
  });

  it("shows the sprint name when assigned", () => {
    render(<TaskSprintSelector sprints={sprints} value={7} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Sprint 1");
  });

  it("picks a sprint", async () => {
    const onChange = vi.fn();
    render(<TaskSprintSelector sprints={sprints} value={null} onChange={onChange} />);
    // Base UI only commits option clicks preceded by pointerdown (real-pointer guard).
    fireEvent.click(screen.getByRole("combobox"));
    const sprint1 = await screen.findByRole("option", { name: "Sprint 1" });
    fireEvent.pointerDown(sprint1);
    fireEvent.click(sprint1);
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("clears back to None", async () => {
    const onChange = vi.fn();
    render(<TaskSprintSelector sprints={sprints} value={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole("combobox"));
    const none = await screen.findByRole("option", { name: "None" });
    fireEvent.pointerDown(none);
    fireEvent.click(none);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
