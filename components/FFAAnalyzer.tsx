"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ALL_TYPES,
  getDefensiveMatchupsWithAbility,
  groupByEffectiveness,
  typeDisplayName,
  TYPE_HEX_COLORS,
} from "@/lib/types";

// ── Types ──

interface RoleData {
  abilities: string[];
  items: string[];
  teraTypes: string[];
  moves: string[];
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
}

interface RandbatsEntry {
  level: number;
  abilities: string[];
  items: string[];
  roles: Record<string, RoleData>;
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
}

interface PokemonListItem {
  name: string;
  id: number;
}

interface PokemonAPIData {
  name: string;
  types: string[];
  sprites?: { front?: string };
  abilities?: { name: string; hidden: boolean }[];
}

interface FieldPokemon {
  name: string;
  displayName: string;
  types: string[];
  sprite: string | null;
  randbatsData: RandbatsEntry | null;
  playerIndex: number;
}

// ── Player colors ──
const PLAYER_COLORS = [
  { bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.5)", text: "#ef4444", label: "Player 2" },
  { bg: "rgba(59, 130, 246, 0.15)", border: "rgba(59, 130, 246, 0.5)", text: "#3b82f6", label: "Player 3" },
  { bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.5)", text: "#a855f7", label: "Player 4" },
];

export default function FFAAnalyzer() {
  const [randbatsData, setRandbatsData] = useState<Record<string, RandbatsEntry> | null>(null);
  const [allPokemon, setAllPokemon] = useState<PokemonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [opponents, setOpponents] = useState<FieldPokemon[][]>([[], [], []]);
  const [selectedPokemon, setSelectedPokemon] = useState<FieldPokemon | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/randbats").then((r) => r.json()),
      fetch("/api/pokemon-list").then((r) => r.json()),
    ])
      .then(([randbats, pokemonList]) => {
        setRandbatsData(randbats);
        setAllPokemon(pokemonList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Calculate available pokemon names from randbats data
  const randbatsNames = useMemo(() => {
    if (!randbatsData) return [];
    return Object.keys(randbatsData).sort();
  }, [randbatsData]);

  const addPokemonToPlayer = useCallback(
    async (name: string, playerIndex: number) => {
      if (!randbatsData) return;

      // Find randbats data (case-insensitive match)
      const randbatsKey = Object.keys(randbatsData).find(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      const rbData = randbatsKey ? randbatsData[randbatsKey] : null;

      // Fetch type info from PokeAPI
      let types: string[] = [];
      let sprite: string | null = null;
      const apiName = name.toLowerCase().replace(/\s+/g, "-");
      try {
        const res = await fetch(`/api/pokemon/${apiName}`);
        if (res.ok) {
          const data: PokemonAPIData = await res.json();
          types = data.types || [];
          sprite = data.sprites?.front || null;
        }
      } catch {
        // ignore
      }

      const pokemon: FieldPokemon = {
        name: apiName,
        displayName: randbatsKey || name,
        types,
        sprite,
        randbatsData: rbData,
        playerIndex,
      };

      setOpponents((prev) => {
        const next = [...prev];
        next[playerIndex] = [...next[playerIndex], pokemon];
        return next;
      });
    },
    [randbatsData]
  );

  const removePokemon = useCallback((playerIndex: number, pokemonIndex: number) => {
    setOpponents((prev) => {
      const next = [...prev];
      next[playerIndex] = next[playerIndex].filter((_, i) => i !== pokemonIndex);
      return next;
    });
    setSelectedPokemon(null);
  }, []);

  const clearPlayer = useCallback((playerIndex: number) => {
    setOpponents((prev) => {
      const next = [...prev];
      next[playerIndex] = [];
      return next;
    });
    setSelectedPokemon(null);
  }, []);

  const clearAll = useCallback(() => {
    setOpponents([[], [], []]);
    setSelectedPokemon(null);
    setExpandedRole(null);
  }, []);

  // Aggregate all opponent pokemon for threat analysis
  const allOpponentPokemon = useMemo(() => opponents.flat(), [opponents]);



  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">FFA</h1>
        <p className="text-white/30 text-xs">Loading random battle data...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">FFA Random Battle</h1>
      <p className="text-[10px] text-white/40 mb-6">
        Add your opponents&apos; Pokémon to see their possible sets, roles, and weaknesses.
      </p>

      {/* Action buttons */}
      {allOpponentPokemon.length > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={clearAll}
            className="text-[10px] text-white/30 hover:text-white transition-colors"
          >
            clear all
          </button>
        </div>
      )}

      {/* Opponents grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {opponents.map((playerPokemon, playerIndex) => (
          <OpponentColumn
            key={playerIndex}
            playerIndex={playerIndex}
            playerColor={PLAYER_COLORS[playerIndex]}
            pokemon={playerPokemon}
            allPokemon={allPokemon}
            randbatsNames={randbatsNames}
            randbatsData={randbatsData}
            onAdd={(name) => addPokemonToPlayer(name, playerIndex)}
            onRemove={(pokemonIndex) => removePokemon(playerIndex, pokemonIndex)}
            onClear={() => clearPlayer(playerIndex)}
            onSelect={setSelectedPokemon}
            selectedPokemon={selectedPokemon}
          />
        ))}
      </div>

      {/* Selected pokemon detail */}
      {selectedPokemon && (
        <PokemonDetail
          pokemon={selectedPokemon}
          playerColor={PLAYER_COLORS[selectedPokemon.playerIndex]}
          expandedRole={expandedRole}
          onToggleRole={(role) =>
            setExpandedRole((prev) => (prev === role ? null : role))
          }
        />
      )}

      {/* Team Threat Summary */}
      {allOpponentPokemon.length > 0 && (
        <ThreatSummary opponents={opponents} playerColors={PLAYER_COLORS} />
      )}
    </div>
  );
}

// ── Opponent Column ──

function OpponentColumn({
  playerIndex,
  playerColor,
  pokemon,
  allPokemon,
  randbatsNames,
  randbatsData,
  onAdd,
  onRemove,
  onClear,
  onSelect,
  selectedPokemon,
}: {
  playerIndex: number;
  playerColor: (typeof PLAYER_COLORS)[number];
  pokemon: FieldPokemon[];
  allPokemon: PokemonListItem[];
  randbatsNames: string[];
  randbatsData: Record<string, RandbatsEntry> | null;
  onAdd: (name: string) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
  onSelect: (p: FieldPokemon) => void;
  selectedPokemon: FieldPokemon | null;
}) {
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [adding, setAdding] = useState(false);

  // Filter suggestions
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = randbatsNames
      .filter((n) => n.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      })
      .slice(0, 6);
    setSuggestions(filtered);
    if (document.activeElement === inputRef.current) {
      setShowSuggestions(filtered.length > 0);
    }
    setSelectedIndex(-1);
  }, [search, randbatsNames]);

  // Click outside handler
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

  const selectPokemon = async (name: string) => {
    setSearch("");
    setShowSuggestions(false);
    setSuggestions([]);
    setAdding(true);
    await onAdd(name);
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter" && search.trim()) {
        selectPokemon(search.trim());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectPokemon(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        selectPokemon(suggestions[0]);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Find sprite ID from allPokemon list
  const getSpriteId = (name: string) => {
    const entry = allPokemon.find(
      (p) => p.name === name.toLowerCase().replace(/\s+/g, "-")
    );
    return entry?.id;
  };

  return (
    <div
      className="border p-3 transition-all"
      style={{
        borderColor: playerColor.border,
        backgroundColor: playerColor.bg,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <p
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: playerColor.text }}
        >
          {playerColor.label}
        </p>
        {pokemon.length > 0 && (
          <button
            onClick={onClear}
            className="text-[9px] text-white/20 hover:text-white/60 transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={pokemon.length >= 6 ? "Max 6" : "Add Pokémon..."}
          disabled={pokemon.length >= 6 || adding}
          className="w-full bg-black/40 border border-white/10 px-2 py-1 text-[10px] focus:border-white/30 outline-none placeholder:text-white/15 disabled:opacity-30"
        />
        {adding && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-white/30">
            ...
          </span>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 left-0 right-0 mt-0.5 bg-black border border-white/20 max-h-48 overflow-y-auto"
          >
            {suggestions.map((name, i) => {
              const spriteId = getSpriteId(name);
              const entry = randbatsData?.[name];
              return (
                <button
                  key={name}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectPokemon(name);
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`w-full text-left px-2 py-1 text-[10px] flex items-center gap-1.5 transition-colors ${
                    i === selectedIndex
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5"
                  }`}
                >
                  {spriteId && (
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`}
                      alt={name}
                      className="w-5 h-5 pixelated"
                      loading="lazy"
                    />
                  )}
                  <span>{name}</span>
                  {entry && (
                    <span className="ml-auto text-[8px] text-white/20">
                      Lv.{entry.level}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pokemon list */}
      <div className="space-y-1">
        {pokemon.map((p, i) => {
          const isSelected =
            selectedPokemon?.name === p.name &&
            selectedPokemon?.playerIndex === p.playerIndex;
          return (
            <div
              key={`${p.name}-${i}`}
              onClick={() => onSelect(p)}
              className={`flex items-center gap-1.5 px-1.5 py-1 cursor-pointer transition-all border ${
                isSelected
                  ? "border-white/30 bg-white/10"
                  : "border-transparent hover:bg-white/5"
              }`}
            >
              {p.sprite && (
                <img src={p.sprite} alt={p.displayName} className="w-6 h-6 pixelated" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate">{p.displayName}</p>
                <div className="flex gap-0.5">
                  {p.types.map((t) => (
                    <span
                      key={t}
                      style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                      className="text-[7px] px-1 py-0 capitalize text-black"
                    >
                      {t}
                    </span>
                  ))}
                  {p.randbatsData && (
                    <span className="text-[7px] text-white/20 ml-1">
                      Lv.{p.randbatsData.level}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="text-[10px] text-white/20 hover:text-red-400 transition-colors px-1"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {pokemon.length === 0 && (
        <p className="text-[9px] text-white/15 text-center py-3">No Pokémon added</p>
      )}
    </div>
  );
}

// ── Pokemon Detail Panel ──

function PokemonDetail({
  pokemon,
  playerColor,
  expandedRole,
  onToggleRole,
}: {
  pokemon: FieldPokemon;
  playerColor: (typeof PLAYER_COLORS)[number];
  expandedRole: string | null;
  onToggleRole: (role: string) => void;
}) {
  const { randbatsData } = pokemon;

  // Defensive matchups
  const matchups =
    pokemon.types.length > 0
      ? getDefensiveMatchupsWithAbility(pokemon.types, null)
      : null;
  const groups = matchups ? groupByEffectiveness(matchups) : null;

  return (
    <div
      className="border p-4 mb-6 transition-all"
      style={{
        borderColor: playerColor.border,
        backgroundColor: "rgba(255,255,255,0.02)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {pokemon.sprite && (
          <img
            src={pokemon.sprite}
            alt={pokemon.displayName}
            className="w-12 h-12 pixelated"
          />
        )}
        <div>
          <p className="text-sm font-bold">{pokemon.displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {pokemon.types.map((t) => (
              <span
                key={t}
                style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                className="text-[9px] px-1.5 py-0.5 capitalize text-black font-medium"
              >
                {typeDisplayName(t)}
              </span>
            ))}
            <span className="text-[10px] text-white/30 ml-1" style={{ color: playerColor.text }}>
              {playerColor.label}
            </span>
          </div>
        </div>
        {randbatsData && (
          <div className="ml-auto text-right">
            <p className="text-[10px] text-white/40">Level {randbatsData.level}</p>
            <p className="text-[9px] text-white/20">
              {Object.keys(randbatsData.roles).length} role
              {Object.keys(randbatsData.roles).length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Roles & Sets */}
        {randbatsData && (
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
              Possible Sets
            </p>
            <div className="space-y-1.5">
              {Object.entries(randbatsData.roles).map(([roleName, role]) => {
                const isExpanded = expandedRole === roleName;
                return (
                  <div key={roleName} className="border border-white/10">
                    <button
                      onClick={() => onToggleRole(roleName)}
                      className={`w-full text-left px-2.5 py-1.5 text-[10px] flex items-center justify-between transition-all ${
                        isExpanded
                          ? "bg-white/10 text-white"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span className="font-medium">{roleName}</span>
                      <span className="text-[8px] text-white/20">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-2.5 py-2 border-t border-white/5 space-y-2">
                        {/* Abilities */}
                        <div>
                          <p className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">
                            Ability
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {role.abilities.map((a) => (
                              <span
                                key={a}
                                className="text-[9px] px-1.5 py-0.5 border border-white/10 text-white/60"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Items */}
                        <div>
                          <p className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">
                            Item
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {role.items.map((item) => (
                              <span
                                key={item}
                                className="text-[9px] px-1.5 py-0.5 border border-white/10 text-white/60"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Moves */}
                        <div>
                          <p className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">
                            Moves (pool)
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {role.moves.map((m) => (
                              <span
                                key={m}
                                className="text-[9px] px-1.5 py-0.5 bg-white/5 text-white/70"
                              >
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Tera Types */}
                        <div>
                          <p className="text-[8px] text-white/30 uppercase tracking-wider mb-0.5">
                            Tera Types
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {role.teraTypes.map((t) => (
                              <span
                                key={t}
                                style={{
                                  backgroundColor:
                                    TYPE_HEX_COLORS[t.toLowerCase()] || "#666",
                                }}
                                className="text-[8px] px-1.5 py-0.5 capitalize text-black font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Possible items summary */}
            <div className="mt-3">
              <p className="text-[8px] text-white/30 uppercase tracking-wider mb-1">
                All possible items
              </p>
              <div className="flex flex-wrap gap-1">
                {randbatsData.items.map((item) => (
                  <span
                    key={item}
                    className="text-[9px] px-1.5 py-0.5 border border-white/10 text-white/40"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Right: Defensive matchups */}
        {groups && (
          <div>
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
              Weaknesses & Resistances
            </p>
            <div className="space-y-2">
              {[4, 2].map((mult) => {
                const types = groups[mult];
                if (!types || types.length === 0) return null;
                return (
                  <div key={mult}>
                    <p className="text-[9px] text-red-400/70 mb-0.5">{mult}x weak</p>
                    <div className="flex flex-wrap gap-1">
                      {types.map((t) => (
                        <span
                          key={t}
                          style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                          className="text-[8px] px-1.5 py-0.5 capitalize text-black font-medium"
                        >
                          {typeDisplayName(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {[0.5, 0.25].map((mult) => {
                const types = groups[mult];
                if (!types || types.length === 0) return null;
                return (
                  <div key={mult}>
                    <p className="text-[9px] text-green-400/70 mb-0.5">{mult}x resist</p>
                    <div className="flex flex-wrap gap-1">
                      {types.map((t) => (
                        <span
                          key={t}
                          style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                          className="text-[8px] px-1.5 py-0.5 capitalize text-black font-medium"
                        >
                          {typeDisplayName(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {groups[0] && groups[0].length > 0 && (
                <div>
                  <p className="text-[9px] text-blue-400/70 mb-0.5">Immune</p>
                  <div className="flex flex-wrap gap-1">
                    {groups[0].map((t) => (
                      <span
                        key={t}
                        style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                        className="text-[8px] px-1.5 py-0.5 capitalize text-black font-medium"
                      >
                        {typeDisplayName(t)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {[1].map((mult) => {
                const types = groups[mult];
                if (!types || types.length === 0) return null;
                return (
                  <div key={mult}>
                    <p className="text-[9px] text-white/30 mb-0.5">Neutral</p>
                    <div className="flex flex-wrap gap-1">
                      {types.map((t) => (
                        <span
                          key={t}
                          style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                          className="text-[8px] px-1.5 py-0.5 capitalize text-black/60 font-medium"
                        >
                          {typeDisplayName(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick tips */}
            {randbatsData && (
              <div className="mt-4 border-t border-white/5 pt-3">
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
                  Quick Tips
                </p>
                <QuickTips pokemon={pokemon} />
              </div>
            )}
          </div>
        )}

        {!randbatsData && (
          <div>
            <p className="text-[10px] text-yellow-400/60">
              ⚠ No random battle data found for this Pokémon. It may not be in the Gen 9 random battle pool.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Quick Tips ──

function QuickTips({ pokemon }: { pokemon: FieldPokemon }) {
  const { randbatsData } = pokemon;
  if (!randbatsData) return null;

  const tips: string[] = [];
  const roleNames = Object.keys(randbatsData.roles);

  // Check for setup moves
  const allMoves = new Set<string>();
  for (const role of Object.values(randbatsData.roles)) {
    for (const m of role.moves) allMoves.add(m);
  }

  const setupMoves = [
    "Swords Dance", "Nasty Plot", "Calm Mind", "Dragon Dance", "Quiver Dance",
    "Shell Smash", "Bulk Up", "Iron Defense", "Agility", "Belly Drum",
    "Shift Gear", "Coil", "Cosmic Power", "Curse", "Tidy Up", "Victory Dance",
    "No Retreat", "Clangorous Soul",
  ];
  const hasSetup = setupMoves.filter((m) => allMoves.has(m));
  if (hasSetup.length > 0) {
    tips.push(`Can set up with: ${hasSetup.join(", ")}`);
  }

  // Priority moves
  const priorityMoves = [
    "Aqua Jet", "Bullet Punch", "Extreme Speed", "Fake Out", "First Impression",
    "Ice Shard", "Jet Punch", "Mach Punch", "Quick Attack", "Shadow Sneak",
    "Sucker Punch", "Vacuum Wave", "Accelerock",
  ];
  const hasPriority = priorityMoves.filter((m) => allMoves.has(m));
  if (hasPriority.length > 0) {
    tips.push(`Has priority: ${hasPriority.join(", ")}`);
  }

  // Hazards
  const hazardMoves = ["Stealth Rock", "Spikes", "Toxic Spikes", "Sticky Web"];
  const hasHazards = hazardMoves.filter((m) => allMoves.has(m));
  if (hasHazards.length > 0) {
    tips.push(`Can set hazards: ${hasHazards.join(", ")}`);
  }

  // Hazard removal
  const removalMoves = ["Rapid Spin", "Defog", "Court Change", "Mortal Spin", "Tidy Up"];
  const hasRemoval = removalMoves.filter((m) => allMoves.has(m));
  if (hasRemoval.length > 0) {
    tips.push(`Has hazard removal: ${hasRemoval.join(", ")}`);
  }

  // Recovery
  const recoveryMoves = [
    "Recover", "Roost", "Moonlight", "Morning Sun", "Synthesis", "Soft-Boiled",
    "Slack Off", "Rest", "Shore Up", "Strength Sap", "Drain Punch", "Giga Drain",
  ];
  const hasRecovery = recoveryMoves.filter((m) => allMoves.has(m));
  if (hasRecovery.length > 0) {
    tips.push(`Has recovery: ${hasRecovery.join(", ")}`);
  }

  // Status moves
  const statusMoves = [
    "Will-O-Wisp", "Thunder Wave", "Spore", "Sleep Powder", "Glare",
    "Toxic", "Nuzzle", "Stun Spore", "Yawn",
  ];
  const hasStatus = statusMoves.filter((m) => allMoves.has(m));
  if (hasStatus.length > 0) {
    tips.push(`Can inflict status: ${hasStatus.join(", ")}`);
  }

  // Phazing
  const phazingMoves = ["Roar", "Whirlwind", "Dragon Tail", "Haze", "Clear Smog"];
  const hasPhazing = phazingMoves.filter((m) => allMoves.has(m));
  if (hasPhazing.length > 0) {
    tips.push(`Can phaze: ${hasPhazing.join(", ")}`);
  }

  if (tips.length === 0) {
    tips.push("Standard attacker — no notable utility detected.");
  }

  return (
    <ul className="space-y-1">
      {tips.map((tip, i) => (
        <li key={i} className="text-[9px] text-white/50 leading-relaxed">
          • {tip}
        </li>
      ))}
    </ul>
  );
}

// ── Threat Summary ──

function ThreatSummary({
  opponents,
  playerColors,
}: {
  opponents: FieldPokemon[][];
  playerColors: typeof PLAYER_COLORS;
}) {
  const allPokemon = opponents.flat();
  if (allPokemon.length === 0) return null;

  // Count how many opponent pokemon are weak to each type
  const typeThreats: Record<
    string,
    { weakCount: number; resistCount: number; immuneCount: number; details: { name: string; mult: number; color: string }[] }
  > = {};

  for (const atkType of ALL_TYPES) {
    let weakCount = 0;
    let resistCount = 0;
    let immuneCount = 0;
    const details: { name: string; mult: number; color: string }[] = [];

    for (const p of allPokemon) {
      if (p.types.length === 0) continue;
      const matchups = getDefensiveMatchupsWithAbility(p.types, null);
      const mult = matchups[atkType];
      const color = playerColors[p.playerIndex].text;

      if (mult === 0) {
        immuneCount++;
        details.push({ name: p.displayName, mult, color });
      } else if (mult > 1) {
        weakCount++;
        details.push({ name: p.displayName, mult, color });
      } else if (mult < 1) {
        resistCount++;
        details.push({ name: p.displayName, mult, color });
      }
    }

    typeThreats[atkType] = { weakCount, resistCount, immuneCount, details };
  }

  // Sort types by how many opponents are weak to them
  const sortedTypes = [...ALL_TYPES].sort(
    (a, b) => typeThreats[b].weakCount - typeThreats[a].weakCount
  );

  // Best types to attack with (most weaknesses, fewest resistances/immunities)
  const bestOffensiveTypes = sortedTypes
    .filter((t) => typeThreats[t].weakCount > 0)
    .slice(0, 6);

  return (
    <div className="border border-white/10 p-4">
      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
        Opponent Weakness Map — Best types to use
      </p>
      <div className="grid grid-cols-6 gap-1.5">
        {ALL_TYPES.map((t) => {
          const { weakCount, resistCount, immuneCount } = typeThreats[t];
          const total = allPokemon.filter((p) => p.types.length > 0).length;
          const effectiveness = weakCount / Math.max(total, 1);

          return (
            <div
              key={t}
              className="text-center border border-white/5 py-2 relative group"
              style={{
                backgroundColor:
                  weakCount >= 3
                    ? "rgba(74, 222, 128, 0.1)"
                    : weakCount >= 2
                    ? "rgba(74, 222, 128, 0.05)"
                    : "transparent",
              }}
            >
              <span
                style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                className="text-[8px] px-1.5 py-0.5 capitalize text-black inline-block"
              >
                {typeDisplayName(t)}
              </span>
              <div className="mt-1">
                {weakCount > 0 && (
                  <p className="text-[9px] text-green-400 font-bold">
                    {weakCount} weak
                  </p>
                )}
                {resistCount > 0 && (
                  <p className="text-[8px] text-red-400/60">{resistCount} resist</p>
                )}
                {immuneCount > 0 && (
                  <p className="text-[8px] text-blue-400/60">{immuneCount} immune</p>
                )}
                {weakCount === 0 && resistCount === 0 && immuneCount === 0 && (
                  <p className="text-[8px] text-white/15">—</p>
                )}
              </div>

              {/* Tooltip on hover */}
              <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-black border border-white/20 p-2 min-w-[140px] text-left shadow-lg shadow-black/50 hidden group-hover:block"
                style={{ pointerEvents: "none" }}
              >
                <p className="text-[9px] font-bold mb-1.5 capitalize text-center">
                  <span style={{ color: TYPE_HEX_COLORS[t] }}>{typeDisplayName(t)}</span> coverage
                </p>
                {typeThreats[t].details
                  .sort((a, b) => b.mult - a.mult)
                  .map((d, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-[8px]" style={{ color: d.color }}>
                        {d.name}
                      </span>
                      <span
                        className={`text-[8px] ${
                          d.mult > 1
                            ? "text-green-400"
                            : d.mult === 0
                            ? "text-blue-400"
                            : d.mult < 1
                            ? "text-red-400"
                            : "text-white/30"
                        }`}
                      >
                        {d.mult === 0 ? "immune" : `${d.mult}x`}
                      </span>
                    </div>
                  ))}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white/20" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Best types recommendation */}
      {bestOffensiveTypes.length > 0 && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">
            Recommended attack types
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bestOffensiveTypes.map((t) => (
              <span
                key={t}
                style={{ backgroundColor: TYPE_HEX_COLORS[t] }}
                className="text-[9px] px-2 py-1 capitalize text-black font-medium"
              >
                {typeDisplayName(t)}{" "}
                <span className="text-black/50">
                  ({typeThreats[t].weakCount} weak)
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
