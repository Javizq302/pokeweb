"use client";

import { useState, useEffect, useMemo } from "react";
import { STAT_KEYS, STAT_LABELS, EV_TOTAL_CAP, EV_STAT_CAP, calcAllStats, getTotalEvs, getNatureInfo, POKEAPI_STAT_MAP } from "@/lib/stats";

interface TeamPokemon {
  pokemonName: string;
  nickname: string | null;
  item: string | null;
  ability: string | null;
  level: number;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
  nature: string | null;
  teraType: string | null;
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

const TERA_TYPES = [
  "Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison",
  "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark",
  "Steel", "Fairy", "Stellar",
];

const NATURES = [
  "Adamant", "Bashful", "Bold", "Brave", "Calm", "Careful", "Docile",
  "Gentle", "Hardy", "Hasty", "Impish", "Jolly", "Lax", "Lonely",
  "Mild", "Modest", "Naive", "Naughty", "Quiet", "Quirky", "Rash",
  "Relaxed", "Sassy", "Serious", "Timid",
];

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
  const [level, setLevel] = useState(existing?.level ?? 100);
  const [nature, setNature] = useState(existing?.nature || "");
  const [teraType, setTeraType] = useState(existing?.teraType || "");
  const [move1, setMove1] = useState(existing?.move1 || "");
  const [move2, setMove2] = useState(existing?.move2 || "");
  const [move3, setMove3] = useState(existing?.move3 || "");
  const [move4, setMove4] = useState(existing?.move4 || "");
  const [evs, setEvs] = useState<Record<string, number>>(parseStats(existing?.evs ?? null, 0));
  const [ivs, setIvs] = useState<Record<string, number>>(parseStats(existing?.ivs ?? null, 31));
  const [saving, setSaving] = useState(false);
  const [baseStats, setBaseStats] = useState<Record<string, number> | null>(null);

  const totalEvs = useMemo(() => getTotalEvs(evs), [evs]);
  const remaining = EV_TOTAL_CAP - totalEvs;

  const natureInfo = useMemo(() => getNatureInfo(nature || null), [nature]);

  const finalStats = useMemo(() => {
    if (!baseStats) return null;
    return calcAllStats(baseStats, evs, ivs, level, nature || null);
  }, [baseStats, evs, ivs, level, nature]);

  // Fetch base stats when pokemon name changes
  useEffect(() => {
    if (!pokemonName.trim()) { setBaseStats(null); return; }
    const timer = setTimeout(() => {
      fetch(`/api/pokemon/${pokemonName.trim().toLowerCase()}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => {
          if (d?.stats) {
            const mapped: Record<string, number> = {};
            for (const [key, val] of Object.entries(d.stats)) {
              const statKey = POKEAPI_STAT_MAP[key];
              if (statKey) mapped[statKey] = val as number;
            }
            setBaseStats(mapped);
          } else {
            setBaseStats(null);
          }
        })
        .catch(() => setBaseStats(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [pokemonName]);

  const handleEvChange = (key: string, raw: number) => {
    const value = Math.max(0, Math.min(EV_STAT_CAP, raw));
    const otherTotal = totalEvs - (evs[key] ?? 0);
    const maxAllowed = Math.min(value, EV_TOTAL_CAP - otherTotal);
    setEvs({ ...evs, [key]: Math.max(0, maxAllowed) });
  };

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
        level,
        nature: nature || null,
        teraType: teraType || null,
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

          {/* Level + Nature + Tera Type */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Level</label>
              <input
                type="number"
                min={1}
                max={100}
                value={level}
                onChange={(e) => setLevel(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none"
              />
            </div>
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
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Tera Type</label>
              <select
                value={teraType}
                onChange={(e) => setTeraType(e.target.value)}
                className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none"
              >
                <option value="">—</option>
                {TERA_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-white/50 uppercase tracking-wider">EVs</label>
              <span className={`text-[10px] ${remaining < 0 ? "text-red-400" : remaining === 0 ? "text-green-400" : "text-white/40"}`}>
                {totalEvs} / {EV_TOTAL_CAP}
                {remaining > 0 && <span className="text-white/20"> ({remaining} left)</span>}
              </span>
            </div>
            {/* EV bar */}
            <div className="w-full h-1 bg-white/10 mb-2">
              <div
                className={`h-full transition-all ${totalEvs > EV_TOTAL_CAP ? "bg-red-400" : "bg-white/40"}`}
                style={{ width: `${Math.min(100, (totalEvs / EV_TOTAL_CAP) * 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-6 gap-1">
              {STAT_KEYS.map((key) => (
                <div key={key}>
                  <label className="text-[9px] text-white/30 block text-center">{STAT_LABELS[key]}</label>
                  <input
                    type="number"
                    min={0}
                    max={EV_STAT_CAP}
                    value={evs[key]}
                    onChange={(e) => handleEvChange(key, parseInt(e.target.value) || 0)}
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

          {/* Calculated Stats */}
          {finalStats && (
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Final Stats</label>
              <div className="grid grid-cols-6 gap-1">
                {STAT_KEYS.map((key) => {
                  const isBoost = natureInfo.boosted === key;
                  const isLower = natureInfo.lowered === key;
                  return (
                    <div key={key} className="text-center">
                      <label className="text-[9px] text-white/30 block">{STAT_LABELS[key]}</label>
                      <span className={`text-xs font-bold ${isBoost ? "text-green-400" : isLower ? "text-red-400" : "text-white/70"}`}>
                        {finalStats[key]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {baseStats && (
                <div className="grid grid-cols-6 gap-1 mt-1">
                  {STAT_KEYS.map((key) => (
                    <div key={key} className="text-center">
                      <span className="text-[9px] text-white/20">base {baseStats[key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
