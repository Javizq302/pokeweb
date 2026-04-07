"use client";

import { useState } from "react";
import { ALL_TYPES, getDefensiveMatchups, groupByEffectiveness, typeDisplayName, TYPE_HEX_COLORS } from "@/lib/types";

export default function DefenseCalc() {
  const [type1, setType1] = useState<string>("");
  const [type2, setType2] = useState<string>("");
  const [pokemonSearch, setPokemonSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sprite, setSprite] = useState<string | null>(null);

  const defenseTypes = [type1, type2].filter(Boolean);
  const matchups = defenseTypes.length > 0 ? getDefensiveMatchups(defenseTypes) : null;
  const groups = matchups ? groupByEffectiveness(matchups) : null;

  const searchPokemon = async () => {
    if (!pokemonSearch.trim()) return;
    setLoading(true);
    setSprite(null);
    try {
      const res = await fetch(`/api/pokemon/${pokemonSearch.trim().toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        setType1(data.types[0] || "");
        setType2(data.types[1] || "");
        setSprite(data.sprites?.front || null);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  return (
    <div>
      <p className="text-[10px] text-white/40 mb-3">Search a Pokemon or pick types to see weaknesses & resistances.</p>

      {/* Pokemon search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={pokemonSearch}
          onChange={(e) => setPokemonSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchPokemon()}
          placeholder="Search Pokemon..."
          className="flex-1 bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20"
        />
        <button
          onClick={searchPokemon}
          disabled={loading}
          className="text-xs border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all disabled:opacity-30"
        >
          {loading ? "..." : "Search"}
        </button>
      </div>

      {/* Type selectors */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <TypeSelect label="Type 1" value={type1} onChange={setType1} />
        <TypeSelect label="Type 2" value={type2} onChange={setType2} exclude={type1} />
      </div>

      {/* Selected types display */}
      {defenseTypes.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {sprite && <img src={sprite} alt="" className="w-10 h-10 pixelated" />}
          <div className="flex gap-1.5">
            {defenseTypes.map((t) => (
              <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[10px] px-2 py-1 capitalize text-black font-medium">
                {typeDisplayName(t)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {groups && (
        <div className="space-y-4">
          <DefenseGroup label="4x weak to" mult={4} groups={groups} />
          <DefenseGroup label="2x weak to" mult={2} groups={groups} />
          <DefenseGroup label="Neutral (1x)" mult={1} groups={groups} />
          <DefenseGroup label="1/2x resistant to" mult={0.5} groups={groups} />
          <DefenseGroup label="1/4x resistant to" mult={0.25} groups={groups} />
          <DefenseGroup label="Immune to (0x)" mult={0} groups={groups} />
        </div>
      )}
    </div>
  );
}

function TypeSelect({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none capitalize"
      >
        <option value="">—</option>
        {ALL_TYPES.filter((t) => t !== exclude).map((t) => (
          <option key={t} value={t} className="capitalize">{typeDisplayName(t)}</option>
        ))}
      </select>
    </div>
  );
}

function DefenseGroup({
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

  const isWeak = mult > 1;
  const isImmune = mult === 0;

  return (
    <div>
      <p className={`text-[10px] mb-1 ${isWeak ? "text-red-400/70" : isImmune ? "text-green-400/70" : "text-white/40"}`}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {types.map((t) => (
          <span
            key={t}
            style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
            className="text-[10px] px-2 py-1 capitalize text-black font-medium"
          >
            {typeDisplayName(t)}
          </span>
        ))}
      </div>
    </div>
  );
}
