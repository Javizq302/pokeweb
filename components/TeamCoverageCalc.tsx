"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ALL_TYPES, analyzeTeamDefense, analyzeTeamOffense, getDefensiveMatchups, getMatchup, getEffectiveness, groupByEffectiveness, typeDisplayName, TYPE_HEX_COLORS } from "@/lib/types";

interface TeamPokemon {
  pokemonName: string;
  move1: string | null;
  move2: string | null;
  move3: string | null;
  move4: string | null;
}

interface Folder {
  id: number;
  name: string;
  teams: { id: number; name: string }[];
}

interface Team {
  id: number;
  name: string;
  pokemon: TeamPokemon[];
}

interface PokemonTypeInfo {
  name: string;
  types: string[];
  moveTypes: string[];
  sprite: string | null;
}

export default function TeamCoverageCalc() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [pokemonInfo, setPokemonInfo] = useState<PokemonTypeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredGridType, setHoveredGridType] = useState<{ type: string; section: "defense" | "offense" } | null>(null);

  useEffect(() => {
    fetch("/api/folders").then((r) => r.json()).then(setFolders).catch(() => {});
  }, []);

  const loadTeam = useCallback(async (teamId: number) => {
    setSelectedTeamId(teamId);
    setLoading(true);
    setPokemonInfo([]);
    setHoveredIndex(null);
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      const data: Team = await res.json();
      setTeam(data);

      // Fetch type info for each pokemon
      const infos = await Promise.all(
        data.pokemon.map(async (p) => {
          try {
            const pRes = await fetch(`/api/pokemon/${p.pokemonName}`);
            const pData = await pRes.json();

            // Get move types
            const moveNames = [p.move1, p.move2, p.move3, p.move4].filter(Boolean) as string[];
            const moveTypes: string[] = [];
            for (const moveName of moveNames) {
              try {
                const mRes = await fetch(`https://pokeapi.co/api/v2/move/${moveName.toLowerCase().replace(/\s+/g, "-")}`, {
                  cache: "force-cache",
                });
                if (mRes.ok) {
                  const mData = await mRes.json();
                  if (mData.type?.name && !moveTypes.includes(mData.type.name)) {
                    moveTypes.push(mData.type.name);
                  }
                }
              } catch {
                // skip move
              }
            }

            return {
              name: pData.name,
              types: pData.types || [],
              moveTypes,
              sprite: pData.sprites?.front || null,
            };
          } catch {
            return { name: p.pokemonName, types: [], moveTypes: [], sprite: null };
          }
        })
      );
      setPokemonInfo(infos);
    } catch {
      setTeam(null);
    }
    setLoading(false);
  }, []);

  const teamTypes = pokemonInfo.map((p) => p.types);
  const teamMoveTypes = pokemonInfo.map((p) => p.moveTypes);

  const defenseAnalysis = teamTypes.length > 0 ? analyzeTeamDefense(teamTypes) : null;
  const offenseAnalysis = teamMoveTypes.length > 0 ? analyzeTeamOffense(teamMoveTypes) : null;

  // Find shared weaknesses (types that hit 3+ pokemon super effectively)
  const sharedWeaknesses = defenseAnalysis
    ? ALL_TYPES.filter((t) => defenseAnalysis[t].weakCount >= 3)
    : [];

  // Find uncovered types (no pokemon has a super effective move against it)
  const uncoveredTypes = offenseAnalysis
    ? ALL_TYPES.filter((t) => offenseAnalysis[t].bestMult <= 1)
    : [];

  // Individual pokemon analysis for hovered pokemon
  const hoveredPokemon = hoveredIndex !== null ? pokemonInfo[hoveredIndex] : null;

  const hoveredDefense = useMemo(() => {
    if (!hoveredPokemon || hoveredPokemon.types.length === 0) return null;
    const matchups = getDefensiveMatchups(hoveredPokemon.types);
    return groupByEffectiveness(matchups);
  }, [hoveredPokemon]);

  const hoveredOffense = useMemo(() => {
    if (!hoveredPokemon || hoveredPokemon.moveTypes.length === 0) return null;
    // For each defending type, find the best multiplier from this pokemon's move types
    const result: Record<string, { mult: number; moveType: string }> = {};
    for (const def of ALL_TYPES) {
      let bestMult = 1;
      let bestMoveType = "";
      for (const atkType of hoveredPokemon.moveTypes) {
        const mult = getEffectiveness(atkType, def);
        if (mult > bestMult) {
          bestMult = mult;
          bestMoveType = atkType;
        }
      }
      // Also check for not-very-effective and immunities
      if (bestMult === 1) {
        for (const atkType of hoveredPokemon.moveTypes) {
          const mult = getEffectiveness(atkType, def);
          if (mult < bestMult || bestMult === 1) {
            bestMult = mult;
            bestMoveType = atkType;
          }
        }
      }
      result[def] = { mult: bestMult, moveType: bestMoveType };
    }
    return result;
  }, [hoveredPokemon]);

  return (
    <div>
      <p className="text-[10px] text-white/40 mb-3">Select a team to analyze its type coverage.</p>

      {/* Team selector */}
      <div className="mb-6">
        <select
          value={selectedTeamId ?? ""}
          onChange={(e) => {
            const id = parseInt(e.target.value);
            if (!isNaN(id)) loadTeam(id);
          }}
          className="w-full bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none"
        >
          <option value="">Select a team...</option>
          {folders.map((f) => (
            <optgroup key={f.id} label={f.name}>
              {f.teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {loading && <p className="text-xs text-white/30">Loading team data...</p>}

      {/* Team members */}
      {pokemonInfo.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Team — hover for individual coverage</p>
          <div className="flex flex-wrap gap-3">
            {pokemonInfo.map((p, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex items-center gap-1.5 border px-2 py-1 cursor-default transition-all ${
                  hoveredIndex === i
                    ? "border-white/40 bg-white/5"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {p.sprite && <img src={p.sprite} alt={p.name} className="w-6 h-6 pixelated" />}
                <span className="text-[10px] capitalize">{p.name}</span>
                <div className="flex gap-0.5 ml-1">
                  {p.types.map((t) => (
                    <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1 py-0.5 capitalize text-black">
                      {typeDisplayName(t)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual pokemon hover detail */}
      {hoveredPokemon && (
        <div className="mb-6 border border-white/10 p-4 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            {hoveredPokemon.sprite && <img src={hoveredPokemon.sprite} alt={hoveredPokemon.name} className="w-10 h-10 pixelated" />}
            <div>
              <p className="text-xs font-bold capitalize">{hoveredPokemon.name}</p>
              <div className="flex gap-1 mt-0.5">
                {hoveredPokemon.types.map((t) => (
                  <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black font-medium">
                    {typeDisplayName(t)}
                  </span>
                ))}
                {hoveredPokemon.moveTypes.length > 0 && (
                  <>
                    <span className="text-[8px] text-white/20 mx-1">moves:</span>
                    {hoveredPokemon.moveTypes.map((t) => (
                      <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black font-medium">
                        {typeDisplayName(t)}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Individual Defensive */}
            {hoveredDefense && (
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Defensive</p>
                <div className="space-y-2">
                  {[4, 2].map((mult) => {
                    const types = hoveredDefense[mult];
                    if (!types || types.length === 0) return null;
                    return (
                      <div key={mult}>
                        <p className="text-[9px] text-red-400/70 mb-0.5">{mult}x weak</p>
                        <div className="flex flex-wrap gap-1">
                          {types.map((t) => (
                            <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                              {typeDisplayName(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {[0.5, 0.25].map((mult) => {
                    const types = hoveredDefense[mult];
                    if (!types || types.length === 0) return null;
                    return (
                      <div key={mult}>
                        <p className="text-[9px] text-green-400/70 mb-0.5">{mult}x resist</p>
                        <div className="flex flex-wrap gap-1">
                          {types.map((t) => (
                            <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                              {typeDisplayName(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {hoveredDefense[0] && hoveredDefense[0].length > 0 && (
                    <div>
                      <p className="text-[9px] text-blue-400/70 mb-0.5">Immune</p>
                      <div className="flex flex-wrap gap-1">
                        {hoveredDefense[0].map((t) => (
                          <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                            {typeDisplayName(t)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Individual Offensive */}
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Offensive</p>
              {hoveredPokemon.moveTypes.length === 0 ? (
                <p className="text-[9px] text-white/20">No moves assigned</p>
              ) : hoveredOffense ? (
                <div className="space-y-2">
                  {/* Super effective */}
                  {(() => {
                    const superEffective = ALL_TYPES.filter((t) => hoveredOffense[t].mult >= 2);
                    if (superEffective.length === 0) return null;
                    return (
                      <div>
                        <p className="text-[9px] text-green-400/70 mb-0.5">Super effective</p>
                        <div className="flex flex-wrap gap-1">
                          {superEffective.map((t) => (
                            <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                              {typeDisplayName(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Not very effective */}
                  {(() => {
                    const notVery = ALL_TYPES.filter((t) => hoveredOffense[t].mult > 0 && hoveredOffense[t].mult < 1);
                    if (notVery.length === 0) return null;
                    return (
                      <div>
                        <p className="text-[9px] text-red-400/70 mb-0.5">Not very effective</p>
                        <div className="flex flex-wrap gap-1">
                          {notVery.map((t) => (
                            <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                              {typeDisplayName(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                  {/* Immune */}
                  {(() => {
                    const immune = ALL_TYPES.filter((t) => hoveredOffense[t].mult === 0);
                    if (immune.length === 0) return null;
                    return (
                      <div>
                        <p className="text-[9px] text-white/30 mb-0.5">Can&apos;t hit</p>
                        <div className="flex flex-wrap gap-1">
                          {immune.map((t) => (
                            <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                              {typeDisplayName(t)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {(sharedWeaknesses.length > 0 || uncoveredTypes.length > 0) && (
        <div className="mb-6 space-y-3">
          {sharedWeaknesses.length > 0 && (
            <div>
              <p className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Shared weaknesses (3+ weak)</p>
              <div className="flex flex-wrap gap-1.5">
                {sharedWeaknesses.map((t) => (
                  <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[10px] px-2 py-1 capitalize text-black font-medium">
                    {typeDisplayName(t)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {uncoveredTypes.length > 0 && (
            <div>
              <p className="text-[10px] text-yellow-400/70 uppercase tracking-wider mb-1">No super effective coverage against</p>
              <div className="flex flex-wrap gap-1.5">
                {uncoveredTypes.map((t) => (
                  <span key={t} style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[10px] px-2 py-1 capitalize text-black font-medium">
                    {typeDisplayName(t)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Defensive chart */}
      {defenseAnalysis && (
        <div className="mb-6">
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Defensive coverage</p>
          <div className="grid grid-cols-6 gap-1">
            {ALL_TYPES.map((t) => {
              const { weakCount, resistCount, immuneCount } = defenseAnalysis[t];
              const isHovered = hoveredGridType?.type === t && hoveredGridType?.section === "defense";
              return (
                <div
                  key={t}
                  className={`text-center border py-1.5 cursor-default transition-all relative ${
                    isHovered ? "border-white/30 bg-white/5" : "border-white/5"
                  }`}
                  onMouseEnter={() => setHoveredGridType({ type: t, section: "defense" })}
                  onMouseLeave={() => setHoveredGridType(null)}
                >
                  <span style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                    {typeDisplayName(t)}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {weakCount > 0 && (
                      <p className="text-[9px] text-red-400">{weakCount} weak</p>
                    )}
                    {resistCount > 0 && (
                      <p className="text-[9px] text-green-400">{resistCount} resist</p>
                    )}
                    {immuneCount > 0 && (
                      <p className="text-[9px] text-blue-400">{immuneCount} immune</p>
                    )}
                    {weakCount === 0 && resistCount === 0 && immuneCount === 0 && (
                      <p className="text-[9px] text-white/20">neutral</p>
                    )}
                  </div>
                  {isHovered && (
                    <GridTooltip
                      type={t}
                      section="defense"
                      pokemonInfo={pokemonInfo}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Offensive chart */}
      {offenseAnalysis && (
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Offensive coverage</p>
          <div className="grid grid-cols-6 gap-1">
            {ALL_TYPES.map((t) => {
              const { bestMult, coveredBy } = offenseAnalysis[t];
              const isHovered = hoveredGridType?.type === t && hoveredGridType?.section === "offense";
              return (
                <div
                  key={t}
                  className={`text-center border py-1.5 cursor-default transition-all relative ${
                    isHovered ? "border-white/30 bg-white/5" : "border-white/5"
                  }`}
                  onMouseEnter={() => setHoveredGridType({ type: t, section: "offense" })}
                  onMouseLeave={() => setHoveredGridType(null)}
                >
                  <span style={{ backgroundColor: TYPE_HEX_COLORS[t] }} className="text-[8px] px-1.5 py-0.5 capitalize text-black">
                    {typeDisplayName(t)}
                  </span>
                  <div className="mt-1">
                    <p className={`text-[9px] font-bold ${
                      bestMult >= 2 ? "text-green-400" : bestMult <= 0.5 ? "text-red-400" : bestMult === 0 ? "text-red-400" : "text-white/40"
                    }`}>
                      {bestMult === 0 ? "immune" : `${bestMult}x`}
                    </p>
                    {coveredBy > 0 && (
                      <p className="text-[9px] text-white/20">{coveredBy} mon{coveredBy > 1 ? "s" : ""}</p>
                    )}
                  </div>
                  {isHovered && (
                    <GridTooltip
                      type={t}
                      section="offense"
                      pokemonInfo={pokemonInfo}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Tooltip component for grid cells
function GridTooltip({
  type,
  section,
  pokemonInfo,
}: {
  type: string;
  section: "defense" | "offense";
  pokemonInfo: PokemonTypeInfo[];
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (section === "defense") {
    // For defensive: show which pokemon are weak/resist/immune to this attacking type
    const weak: PokemonTypeInfo[] = [];
    const resist: PokemonTypeInfo[] = [];
    const immune: PokemonTypeInfo[] = [];
    const neutral: PokemonTypeInfo[] = [];

    for (const p of pokemonInfo) {
      if (p.types.length === 0) continue;
      const mult = getMatchup(type, p.types);
      if (mult === 0) immune.push(p);
      else if (mult > 1) weak.push(p);
      else if (mult < 1) resist.push(p);
      else neutral.push(p);
    }

    return (
      <div
        ref={tooltipRef}
        className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-black border border-white/20 p-3 min-w-[180px] text-left shadow-lg shadow-black/50"
        style={{ pointerEvents: "none" }}
      >
        <p className="text-[10px] font-bold mb-2 capitalize text-center">
          vs <span style={{ color: TYPE_HEX_COLORS[type] }}>{typeDisplayName(type)}</span>
        </p>
        {weak.length > 0 && (
          <div className="mb-1.5">
            <p className="text-[9px] text-red-400 mb-0.5">Weak</p>
            {weak.map((p) => (
              <div key={p.name} className="flex items-center gap-1 mb-0.5">
                {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
                <span className="text-[9px] capitalize text-white/70">{p.name}</span>
                <span className="text-[8px] text-red-400/70 ml-auto">{getMatchup(type, p.types)}x</span>
              </div>
            ))}
          </div>
        )}
        {resist.length > 0 && (
          <div className="mb-1.5">
            <p className="text-[9px] text-green-400 mb-0.5">Resist</p>
            {resist.map((p) => (
              <div key={p.name} className="flex items-center gap-1 mb-0.5">
                {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
                <span className="text-[9px] capitalize text-white/70">{p.name}</span>
                <span className="text-[8px] text-green-400/70 ml-auto">{getMatchup(type, p.types)}x</span>
              </div>
            ))}
          </div>
        )}
        {immune.length > 0 && (
          <div className="mb-1.5">
            <p className="text-[9px] text-blue-400 mb-0.5">Immune</p>
            {immune.map((p) => (
              <div key={p.name} className="flex items-center gap-1 mb-0.5">
                {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
                <span className="text-[9px] capitalize text-white/70">{p.name}</span>
              </div>
            ))}
          </div>
        )}
        {neutral.length > 0 && (
          <div>
            <p className="text-[9px] text-white/30 mb-0.5">Neutral</p>
            {neutral.map((p) => (
              <div key={p.name} className="flex items-center gap-1 mb-0.5">
                {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
                <span className="text-[9px] capitalize text-white/20">{p.name}</span>
              </div>
            ))}
          </div>
        )}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white/20" />
      </div>
    );
  }

  // Offensive: show which pokemon can hit this defending type
  const superEffective: { pokemon: PokemonTypeInfo; moveType: string; mult: number }[] = [];
  const notVery: { pokemon: PokemonTypeInfo; moveType: string; mult: number }[] = [];
  const cannotHit: PokemonTypeInfo[] = [];
  const noMoves: PokemonTypeInfo[] = [];

  for (const p of pokemonInfo) {
    if (p.moveTypes.length === 0) {
      noMoves.push(p);
      continue;
    }
    let bestMult = 0;
    let bestMoveType = "";
    for (const mt of p.moveTypes) {
      const mult = getEffectiveness(mt, type);
      if (mult > bestMult) {
        bestMult = mult;
        bestMoveType = mt;
      }
    }
    if (bestMult >= 2) {
      superEffective.push({ pokemon: p, moveType: bestMoveType, mult: bestMult });
    } else if (bestMult === 0) {
      cannotHit.push(p);
    } else if (bestMult < 1) {
      notVery.push({ pokemon: p, moveType: bestMoveType, mult: bestMult });
    }
  }

  return (
    <div
      ref={tooltipRef}
      className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 bg-black border border-white/20 p-3 min-w-[180px] text-left shadow-lg shadow-black/50"
      style={{ pointerEvents: "none" }}
    >
      <p className="text-[10px] font-bold mb-2 capitalize text-center">
        hitting <span style={{ color: TYPE_HEX_COLORS[type] }}>{typeDisplayName(type)}</span>
      </p>
      {superEffective.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] text-green-400 mb-0.5">Super effective</p>
          {superEffective.map(({ pokemon: p, moveType, mult }) => (
            <div key={p.name} className="flex items-center gap-1 mb-0.5">
              {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
              <span className="text-[9px] capitalize text-white/70">{p.name}</span>
              <span style={{ backgroundColor: TYPE_HEX_COLORS[moveType] }} className="text-[7px] px-1 py-0 capitalize text-black ml-auto">
                {moveType}
              </span>
              <span className="text-[8px] text-green-400/70">{mult}x</span>
            </div>
          ))}
        </div>
      )}
      {notVery.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] text-red-400 mb-0.5">Not very effective</p>
          {notVery.map(({ pokemon: p, moveType, mult }) => (
            <div key={p.name} className="flex items-center gap-1 mb-0.5">
              {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
              <span className="text-[9px] capitalize text-white/70">{p.name}</span>
              <span style={{ backgroundColor: TYPE_HEX_COLORS[moveType] }} className="text-[7px] px-1 py-0 capitalize text-black ml-auto">
                {moveType}
              </span>
              <span className="text-[8px] text-red-400/70">{mult}x</span>
            </div>
          ))}
        </div>
      )}
      {cannotHit.length > 0 && (
        <div className="mb-1.5">
          <p className="text-[9px] text-white/30 mb-0.5">Can&apos;t hit</p>
          {cannotHit.map((p) => (
            <div key={p.name} className="flex items-center gap-1 mb-0.5">
              {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
              <span className="text-[9px] capitalize text-white/30">{p.name}</span>
            </div>
          ))}
        </div>
      )}
      {noMoves.length > 0 && (
        <div>
          <p className="text-[9px] text-white/20 mb-0.5">No moves</p>
          {noMoves.map((p) => (
            <div key={p.name} className="flex items-center gap-1 mb-0.5">
              {p.sprite && <img src={p.sprite} alt="" className="w-4 h-4 pixelated" />}
              <span className="text-[9px] capitalize text-white/20">{p.name}</span>
            </div>
          ))}
        </div>
      )}
      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-white/20" />
    </div>
  );
}
