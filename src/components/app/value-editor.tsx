import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cashUnit, teamUnit } from "@/lib/values";

/**
 * Team value + cash editor. Writes land on the story's tags (`50cook`,
 * `100usd`) via the caller's onSave — the Taiga story stays the record and
 * GovKit's sync picks the tags up with no backend change.
 *
 * Cash is required at the form level: the field is always a number, prefilled
 * 0 (explicit zero counts as set; the backend treats missing cash as 0 and it
 * never blocks a drop).
 */
export function ValueEditor({
  initialTeam,
  initialCash,
  onSave,
  onCancel,
}: {
  initialTeam: number | null;
  initialCash: number | null;
  onSave: (team: number | null, cash: number) => void;
  onCancel: () => void;
}) {
  const [teamText, setTeamText] = useState(initialTeam != null ? String(initialTeam) : "");
  const [cashText, setCashText] = useState(initialCash != null ? String(initialCash) : "0");
  const [error, setError] = useState("");

  function commit() {
    const teamTrimmed = teamText.trim();
    const cashTrimmed = cashText.trim();
    const team = teamTrimmed === "" ? null : Number.parseInt(teamTrimmed, 10);
    const cash = cashTrimmed === "" ? Number.NaN : Number.parseInt(cashTrimmed, 10);
    if (team != null && (!Number.isFinite(team) || team < 0)) {
      setError(`Team value must be 0 or more ${teamUnit()}.`);
      return;
    }
    if (!Number.isFinite(cash) || cash < 0) {
      setError(`Cash is required — enter 0 or more ${cashUnit()}.`);
      return;
    }
    onSave(team, cash);
  }

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-16 text-xs">Team</label>
        <Input
          inputMode="numeric"
          placeholder={`e.g. 50 (${teamUnit()})`}
          value={teamText}
          onChange={(e) => setTeamText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onCancel();
          }}
          className="h-8 w-36"
          autoFocus
        />
        <span className="text-muted-foreground text-xs">{teamUnit()}</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-muted-foreground w-16 text-xs">Cash</label>
        <Input
          inputMode="numeric"
          placeholder={`e.g. 0 (${cashUnit()})`}
          value={cashText}
          onChange={(e) => setCashText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onCancel();
          }}
          className="h-8 w-36"
        />
        <span className="text-muted-foreground text-xs">{cashUnit()}</span>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={commit}>
          Save value
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
