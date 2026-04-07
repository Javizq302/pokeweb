"use client";

import { useState } from "react";
import { ALL_TYPES, getOffensiveMatchups, groupByEffectiveness, typeDisplayName, TYPE_COLORS } from "@/lib/types";

export default function AttackCalc() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const matchups = selectedType ? getOffensiveMatchups(selectedType) : null;
  const groups = matchups ? groupByEffectiveness(matchups) : null;

  return (
    <div>
      <p className="text-[10px] text-white/40 mb-3">Select an attacking type to see its effectiveness.</p>

      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t === selectedType ? null : t)}
            className={`text-[10px] px-2 py-1 capitalize transition-all ${
              t === selectedType
                ? `${TYPE_COLORS[t]} text-black font-bold`
                : "border border-white/10 text-white/50 hover:border-white/30"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Results */}
      {groups && (
        <div className="space-y-4">
          <EffectivenessGroup label="Super effective (4x)" mult={4} groups={groups} />
          <EffectivenessGroup label="Super effective (2x)" mult={2} groups={groups} />
          <EffectivenessGroup label="Normal (1x)" mult={1} groups={groups} />
          <EffectivenessGroup label="Not very effective (0.5x)" mult={0.5} groups={groups} />
          <EffectivenessGroup label="Not very effective (0.25x)" mult={0.25} groups={groups} />
          <EffectivenessGroup label="No effect (0x)" mult={0} groups={groups} />
        </div>
      )}
    </div>
  );
}

function EffectivenessGroup({
  label,
  mult,
  groups,
}: {
  label: string;
  mult: number;
  groups: Record<number, string[]>;
}) {
  const types = groups[mult];
  if (!types || types.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] text-white/40 mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <span
            key={t}
            className={`text-[10px] px-2 py-1 capitalize ${TYPE_COLORS[t]} text-black font-medium`}
          >
            {typeDisplayName(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
