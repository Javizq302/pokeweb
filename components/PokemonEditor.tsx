"use client";

import { useState } from "react";

interface TeamPokemon {
  pokemonName: string;
  nickname: string | null;
  item: string | null;
  ability: string | null;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  nature: string | null;
  evs: string | null;
  ivs: string | null;
}

interface Props {
  teamId: number;
  slot: number;
  existing: TeamPokemon | null;
  onClose: () => void;
  onSaved: () => void;
}

const NATURES = [
  "Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile",
  "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely",
  "Mild", "Modest", "Naive", "Naughty", "Quiet", "Quirky", "Rash",
  "Relaxed", "Sassy", "Serious", "Timid",
];

const STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"] as const;
const STAT_LABELS: Record<string, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

function parseStats(json: string | null, defaultVal: number): Record<string, number> {
  if (!json) return Object.fromEntries(STAT_KEYS.map((k) => [k, defaultVal]));
  try {
    const parsed = JSON.parse(json);
    return Object.fromEntries(STAT_KEYS.map((k) => [k, parsed[k] ?? defaultVal]));
  } catch {
    return Object.fromEntries(STAT_KEYS.map((k) => [k, defaultVal]));
  }
}

export default function PokemonEditor({ teamId, slot, existing, onClose, onSaved }: Props) {
  const [pokemonName, setPokemonName] = useState(existing?.pokemonName || "");
  const [nickname, setNickname] = useState(existing?.nickname || "");
  const [item, setItem] = useState(existing?.item || "");
  const [ability, setAbility] = useState(existing?.ability || "");
  const [nature, setNature] = useState(existing?.nature || "");
  const [move1, setMove1] = useState(existing?.move1 || "");
  const [move2, setMove2] = useState(existing?.move2 || "");
  const [move3, setMove3] = useState(existing?.move3 || "");
  const [move4, setMove4] = useState(existing?.move4 || "");
  const [evs, setEvs] = useState<Record<string, number>>(parseStats(existing?.evs ?? null, 0));
  const [ivs, setIvs] = useState<Record<string, number>>(parseStats(existing?.ivs ?? null, 31));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!pokemonName.trim()) return;
    setSaving(true);
    await fetch(`/api/teams/${teamId}/pokemon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pokemonName: pokemonName.trim(),
        slot,
        nickname: nickname.trim() || null,
        item: item.trim() || null,
        ability: ability.trim() || null,
        nature: nature || null,
        move1: move1.trim() || null,
        move2: move2.trim() || null,
        move3: move3.trim() || null,
        move4: move4.trim() || null,
        evs,
        ivs,
      }),
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-black border border-white/20 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold uppercase tracking-wider">
            {existing ? "Edit" : "Add"} Pokemon — Slot {slot}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xs">close</button>
        </div>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pokemon *" value={pokemonName} onChange={setPokemonName} placeholder="e.g. garchomp" />
            <Field label="Nickname" value={nickname} onChange={setNickname} />
            <Field label="Item" value={item} onChange={setItem} placeholder="e.g. Choice Scarf" />
            <Field label="Ability" value={ability} onChange={setAbility} placeholder="e.g. Rough Skin" />
          </div>

          {/* Nature */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Nature</label>
            <select
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none"
            >
              <option value="">—</option>
              {NATURES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Moves */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Moves</label>
            <div className="grid grid-cols-2 gap-2">
              <Field value={move1} onChange={setMove1} placeholder="Move 1" />
              <Field value={move2} onChange={setMove2} placeholder="Move 2" />
              <Field value={move3} onChange={setMove3} placeholder="Move 3" />
              <Field value={move4} onChange={setMove4} placeholder="Move 4" />
            </div>
          </div>

          {/* EVs */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">EVs</label>
            <div className="grid grid-cols-6 gap-1">
              {STAT_KEYS.map((key) => (
                <div key={key}>
                  <label className="text-[9px] text-white/30 block text-center">{STAT_LABELS[key]}</label>
                  <input
                    type="number"
                    min={0}
                    max={252}
                    value={evs[key]}
                    onChange={(e) => setEvs({ ...evs, [key]: Math.min(252, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="w-full bg-black border border-white/20 px-1 py-1 text-[10px] text-center focus:border-white/50 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* IVs */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">IVs</label>
            <div className="grid grid-cols-6 gap-1">
              {STAT_KEYS.map((key) => (
                <div key={key}>
                  <label className="text-[9px] text-white/30 block text-center">{STAT_LABELS[key]}</label>
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={ivs[key]}
                    onChange={(e) => setIvs({ ...ivs, [key]: Math.min(31, Math.max(0, parseInt(e.target.value) || 0)) })}
                    className="w-full bg-black border border-white/20 px-1 py-1 text-[10px] text-center focus:border-white/50 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!pokemonName.trim() || saving}
            className="w-full border border-white/20 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      {label && <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">{label}</label>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20"
      />
    </div>
  );
}
