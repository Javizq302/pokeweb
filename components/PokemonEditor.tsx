"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

interface PokemonListItem {
  name: string;
  id: number;
}

interface ItemListItem {
  name: string;
  sprite: string;
}

interface AbilityListItem {
  name: string;
}

interface MoveListItem {
  name: string;
}

interface Props {
  teamId: number;
  slot: number;
  existing: TeamPokemon | null;
  initialBaseStats?: Record<string, number> | null;
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

/** Formats a PokeAPI slug like "choice-scarf" into "Choice Scarf" */
function formatName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Converts a display name like "King's Rock" into the PokeAPI slug "kings-rock" */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")       // strip apostrophes (King's → Kings)
    .replace(/[^a-z0-9]+/g, "-") // any non-alphanumeric run → single hyphen
    .replace(/^-|-$/g, "");       // trim leading/trailing hyphens
}

/** Returns the item sprite URL for a saved item name (e.g. "Choice Scarf" → choice-scarf) */
export function getItemSpriteUrl(itemName: string): string {
  const slug = toSlug(itemName);
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

export default function PokemonEditor({ teamId, slot, existing, initialBaseStats, onClose, onSaved }: Props) {
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
  const [baseStats, setBaseStats] = useState<Record<string, number> | null>(initialBaseStats ?? null);
  const [itemSpriteOk, setItemSpriteOk] = useState(false);

  // Pokemon autocomplete state
  const [allPokemon, setAllPokemon] = useState<PokemonListItem[]>([]);
  const [pokeSuggestions, setPokeSuggestions] = useState<PokemonListItem[]>([]);
  const [showPokeSuggestions, setShowPokeSuggestions] = useState(false);
  const [pokeSelectedIndex, setPokeSelectedIndex] = useState(-1);
  const pokeInputRef = useRef<HTMLInputElement>(null);
  const pokeSuggestionsRef = useRef<HTMLDivElement>(null);

  // Item autocomplete state
  const [allItems, setAllItems] = useState<ItemListItem[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<ItemListItem[]>([]);
  const [showItemSuggestions, setShowItemSuggestions] = useState(false);
  const [itemSelectedIndex, setItemSelectedIndex] = useState(-1);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const itemSuggestionsRef = useRef<HTMLDivElement>(null);

  // Ability autocomplete state
  const [allAbilities, setAllAbilities] = useState<AbilityListItem[]>([]);
  const [abilitySuggestions, setAbilitySuggestions] = useState<AbilityListItem[]>([]);
  const [showAbilitySuggestions, setShowAbilitySuggestions] = useState(false);
  const [abilitySelectedIndex, setAbilitySelectedIndex] = useState(-1);
  const abilityInputRef = useRef<HTMLInputElement>(null);
  const abilitySuggestionsRef = useRef<HTMLDivElement>(null);

  // Move list (shared across all 4 move autocompletes)
  const [allMoves, setAllMoves] = useState<MoveListItem[]>([]);

  const totalEvs = useMemo(() => getTotalEvs(evs), [evs]);
  const remaining = EV_TOTAL_CAP - totalEvs;

  const natureInfo = useMemo(() => getNatureInfo(nature || null), [nature]);

  const finalStats = useMemo(() => {
    if (!baseStats) return null;
    return calcAllStats(baseStats, evs, ivs, level, nature || null);
  }, [baseStats, evs, ivs, level, nature]);

  // ---------- Fetch lists once ----------

  useEffect(() => {
    fetch("/api/pokemon-list")
      .then((r) => r.json())
      .then((data: PokemonListItem[]) => setAllPokemon(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/item-list")
      .then((r) => r.json())
      .then((data: ItemListItem[]) => setAllItems(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/ability-list")
      .then((r) => r.json())
      .then((data: AbilityListItem[]) => setAllAbilities(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/move-list")
      .then((r) => r.json())
      .then((data: MoveListItem[]) => setAllMoves(data))
      .catch(() => {});
  }, []);

  // ---------- Filter suggestions ----------

  // Pokemon
  useEffect(() => {
    const query = pokemonName.trim().toLowerCase();
    if (query.length < 1) {
      setPokeSuggestions([]);
      setShowPokeSuggestions(false);
      return;
    }
    const filtered = allPokemon
      .filter((p) => p.name.includes(query))
      .sort((a, b) => {
        const aStarts = a.name.startsWith(query) ? 0 : 1;
        const bStarts = b.name.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.id - b.id;
      })
      .slice(0, 8);
    setPokeSuggestions(filtered);
    if (document.activeElement === pokeInputRef.current) {
      setShowPokeSuggestions(filtered.length > 0);
    }
    setPokeSelectedIndex(-1);
  }, [pokemonName, allPokemon]);

  // Item
  useEffect(() => {
    setItemSpriteOk(false); // reset on every item change
    const query = toSlug(item.trim());
    if (query.length < 1) {
      setItemSuggestions([]);
      setShowItemSuggestions(false);
      return;
    }
    const filtered = allItems
      .filter((i) => i.name.includes(query))
      .sort((a, b) => {
        const aStarts = a.name.startsWith(query) ? 0 : 1;
        const bStarts = b.name.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
    setItemSuggestions(filtered);
    if (document.activeElement === itemInputRef.current) {
      setShowItemSuggestions(filtered.length > 0);
    }
    setItemSelectedIndex(-1);
  }, [item, allItems]);

  // Ability
  useEffect(() => {
    const query = toSlug(ability.trim());
    if (query.length < 1) {
      setAbilitySuggestions([]);
      setShowAbilitySuggestions(false);
      return;
    }
    const filtered = allAbilities
      .filter((a) => a.name.includes(query))
      .sort((a, b) => {
        const aStarts = a.name.startsWith(query) ? 0 : 1;
        const bStarts = b.name.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
    setAbilitySuggestions(filtered);
    if (document.activeElement === abilityInputRef.current) {
      setShowAbilitySuggestions(filtered.length > 0);
    }
    setAbilitySelectedIndex(-1);
  }, [ability, allAbilities]);

  // ---------- Click-outside handlers ----------

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        pokeSuggestionsRef.current &&
        !pokeSuggestionsRef.current.contains(e.target as Node) &&
        pokeInputRef.current &&
        !pokeInputRef.current.contains(e.target as Node)
      ) {
        setShowPokeSuggestions(false);
      }
      if (
        itemSuggestionsRef.current &&
        !itemSuggestionsRef.current.contains(e.target as Node) &&
        itemInputRef.current &&
        !itemInputRef.current.contains(e.target as Node)
      ) {
        setShowItemSuggestions(false);
      }
      if (
        abilitySuggestionsRef.current &&
        !abilitySuggestionsRef.current.contains(e.target as Node) &&
        abilityInputRef.current &&
        !abilityInputRef.current.contains(e.target as Node)
      ) {
        setShowAbilitySuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ---------- Select handlers ----------

  const selectPokemonName = (name: string) => {
    setPokemonName(name);
    setShowPokeSuggestions(false);
  };

  const selectItem = (slug: string) => {
    setItem(formatName(slug));
    setShowItemSuggestions(false);
  };

  const selectAbility = (slug: string) => {
    setAbility(formatName(slug));
    setShowAbilitySuggestions(false);
  };

  // ---------- Keyboard handlers ----------

  const handlePokeKeyDown = (e: React.KeyboardEvent) => {
    if (!showPokeSuggestions || pokeSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPokeSelectedIndex((prev) => Math.min(prev + 1, pokeSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPokeSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (pokeSelectedIndex >= 0) {
        selectPokemonName(pokeSuggestions[pokeSelectedIndex].name);
      } else if (pokeSuggestions.length > 0) {
        selectPokemonName(pokeSuggestions[0].name);
      }
    } else if (e.key === "Escape") {
      setShowPokeSuggestions(false);
    }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent) => {
    if (!showItemSuggestions || itemSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setItemSelectedIndex((prev) => Math.min(prev + 1, itemSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setItemSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (itemSelectedIndex >= 0) {
        selectItem(itemSuggestions[itemSelectedIndex].name);
      } else if (itemSuggestions.length > 0) {
        selectItem(itemSuggestions[0].name);
      }
    } else if (e.key === "Escape") {
      setShowItemSuggestions(false);
    }
  };

  const handleAbilityKeyDown = (e: React.KeyboardEvent) => {
    if (!showAbilitySuggestions || abilitySuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAbilitySelectedIndex((prev) => Math.min(prev + 1, abilitySuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAbilitySelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (abilitySelectedIndex >= 0) {
        selectAbility(abilitySuggestions[abilitySelectedIndex].name);
      } else if (abilitySuggestions.length > 0) {
        selectAbility(abilitySuggestions[0].name);
      }
    } else if (e.key === "Escape") {
      setShowAbilitySuggestions(false);
    }
  };

  // ---------- Fetch base stats ----------

  const initialNameRef = useRef(existing?.pokemonName || "");

  useEffect(() => {
    if (!pokemonName.trim()) { setBaseStats(null); return; }
    // Skip fetch if we already have stats for the initial pokemon (passed from card)
    if (initialBaseStats && pokemonName.trim().toLowerCase() === initialNameRef.current.toLowerCase()) {
      return;
    }
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

  // Helper: current item sprite URL (for the preview next to the input)
  const currentItemSprite = item.trim() ? getItemSpriteUrl(item.trim()) : null;
  const showItemInlineSprite = currentItemSprite && itemSpriteOk;

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
            {/* Pokemon name with autocomplete */}
            <div className="relative">
              <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Pokemon *</label>
              <input
                ref={pokeInputRef}
                type="text"
                value={pokemonName}
                onChange={(e) => setPokemonName(e.target.value)}
                onFocus={() => {
                  if (pokeSuggestions.length > 0) setShowPokeSuggestions(true);
                }}
                onKeyDown={handlePokeKeyDown}
                placeholder="e.g. garchomp"
                className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20 capitalize"
              />
              {showPokeSuggestions && (
                <div
                  ref={pokeSuggestionsRef}
                  className="absolute z-[60] left-0 right-0 mt-0.5 bg-black border border-white/20 max-h-52 overflow-y-auto"
                >
                  {pokeSuggestions.map((p, i) => (
                    <button
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectPokemonName(p.name);
                      }}
                      onMouseEnter={() => setPokeSelectedIndex(i)}
                      className={`w-full text-left px-2 py-1.5 text-xs capitalize flex items-center gap-2 transition-colors ${
                        i === pokeSelectedIndex
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                        alt={p.name}
                        className="w-6 h-6 pixelated"
                        loading="lazy"
                      />
                      <span className="text-white/20 text-[10px] w-6 text-right">#{p.id}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Field label="Nickname" value={nickname} onChange={setNickname} />

            {/* Item with autocomplete + sprite */}
            <div className="relative">
              <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Item</label>
              <div className="relative">
                {currentItemSprite && (
                  <img
                    src={currentItemSprite}
                    alt={item}
                    className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 pixelated pointer-events-none ${itemSpriteOk ? '' : 'hidden'}`}
                    onLoad={() => setItemSpriteOk(true)}
                    onError={() => setItemSpriteOk(false)}
                  />
                )}
                <input
                  ref={itemInputRef}
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  onFocus={() => {
                    if (itemSuggestions.length > 0) setShowItemSuggestions(true);
                  }}
                  onKeyDown={handleItemKeyDown}
                  placeholder="e.g. Choice Scarf"
                  className={`w-full bg-black border border-white/20 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20 ${
                    showItemInlineSprite ? "pl-8 pr-2" : "px-2"
                  }`}
                />
              </div>
              {showItemSuggestions && (
                <div
                  ref={itemSuggestionsRef}
                  className="absolute z-[60] left-0 right-0 mt-0.5 bg-black border border-white/20 max-h-52 overflow-y-auto"
                >
                  {itemSuggestions.map((it, i) => (
                    <button
                      key={it.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectItem(it.name);
                      }}
                      onMouseEnter={() => setItemSelectedIndex(i)}
                      className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                        i === itemSelectedIndex
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <img
                        src={it.sprite}
                        alt={it.name}
                        className="w-5 h-5 pixelated flex-shrink-0"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <span>{formatName(it.name)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ability with autocomplete */}
            <div className="relative">
              <label className="text-[10px] text-white/50 uppercase tracking-wider block mb-1">Ability</label>
              <input
                ref={abilityInputRef}
                type="text"
                value={ability}
                onChange={(e) => setAbility(e.target.value)}
                onFocus={() => {
                  if (abilitySuggestions.length > 0) setShowAbilitySuggestions(true);
                }}
                onKeyDown={handleAbilityKeyDown}
                placeholder="e.g. Rough Skin"
                className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20"
              />
              {showAbilitySuggestions && (
                <div
                  ref={abilitySuggestionsRef}
                  className="absolute z-[60] left-0 right-0 mt-0.5 bg-black border border-white/20 max-h-52 overflow-y-auto"
                >
                  {abilitySuggestions.map((ab, i) => (
                    <button
                      key={ab.name}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectAbility(ab.name);
                      }}
                      onMouseEnter={() => setAbilitySelectedIndex(i)}
                      className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                        i === abilitySelectedIndex
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <span>{formatName(ab.name)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
              <MoveAutocomplete value={move1} onChange={setMove1} allMoves={allMoves} placeholder="Move 1" />
              <MoveAutocomplete value={move2} onChange={setMove2} allMoves={allMoves} placeholder="Move 2" />
              <MoveAutocomplete value={move3} onChange={setMove3} allMoves={allMoves} placeholder="Move 3" />
              <MoveAutocomplete value={move4} onChange={setMove4} allMoves={allMoves} placeholder="Move 4" />
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

/** Self-contained move autocomplete field */
function MoveAutocomplete({
  value,
  onChange,
  allMoves,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  allMoves: MoveListItem[];
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<MoveListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter
  useEffect(() => {
    const query = toSlug(value.trim());
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = allMoves
      .filter((m) => m.name.includes(query))
      .sort((a, b) => {
        const aStarts = a.name.startsWith(query) ? 0 : 1;
        const bStarts = b.name.startsWith(query) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8);
    setSuggestions(filtered);
    if (document.activeElement === inputRef.current) {
      setShowSuggestions(filtered.length > 0);
    }
    setSelectedIndex(-1);
  }, [value, allMoves]);

  // Click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectMove = (slug: string) => {
    onChange(formatName(slug));
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectMove(suggestions[selectedIndex].name);
      } else if (suggestions.length > 0) {
        selectMove(suggestions[0].name);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20"
      />
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-[60] left-0 right-0 mt-0.5 bg-black border border-white/20 max-h-52 overflow-y-auto"
        >
          {suggestions.map((m, i) => (
            <button
              key={m.name}
              onMouseDown={(e) => {
                e.preventDefault();
                selectMove(m.name);
              }}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`w-full text-left px-2 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                i === selectedIndex
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5"
              }`}
            >
              <span>{formatName(m.name)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
