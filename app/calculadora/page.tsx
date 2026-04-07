"use client";

import { useState } from "react";
import AttackCalc from "@/components/AttackCalc";
import DefenseCalc from "@/components/DefenseCalc";
import TeamCoverageCalc from "@/components/TeamCoverageCalc";

const TABS = [
  { id: "attack", label: "Attack" },
  { id: "defense", label: "Defense" },
  { id: "team", label: "Team Coverage" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function CalculadoraPage() {
  const [tab, setTab] = useState<TabId>("attack");

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Type Calculator</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-sm px-4 py-2 transition-all border-b-2 -mb-px ${
              tab === t.id
                ? "border-white text-white font-bold"
                : "border-transparent text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "attack" && <AttackCalc />}
      {tab === "defense" && <DefenseCalc />}
      {tab === "team" && <TeamCoverageCalc />}
    </div>
  );
}
