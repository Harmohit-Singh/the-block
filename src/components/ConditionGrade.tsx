import { formatConditionGrade } from "../lib/format";

/**
 * Condition grade as a colour-coded pill.
 *
 * A bare "3.8" means nothing to someone new to wholesale auctions. The colour
 * carries the judgement — roughly: 4+ is clean, 3s show wear, below 3 needs
 * work — while the number stays visible for buyers who know the scale.
 */
export function ConditionGrade({ grade }: { grade: number }) {
  const tone = grade >= 4 ? "good" : grade >= 3 ? "warn" : "bad";

  return (
    <span className={`pill pill--${tone}`} title="Inspection grade out of 5">
      {formatConditionGrade(grade)}
    </span>
  );
}
