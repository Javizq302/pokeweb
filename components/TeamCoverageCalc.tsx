"use client";

import { useState, useEffect, useCallback } from "react";
import { ALL_TYPES, analyzeTeamDefense, analyzeTeamOffense, typeDisplayName, TYPE_COLORS } from "@/lib/types";

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

  useEffect(() => {
    fetch("/api/folders").then((r) => r.json()).then(setFolders).catch(() => {});
  }, []);

  const loadTeam = useCallback(async (teamId: number) => {
    setSelectedTeamId(teamId);
    setLoading(true);
    setPokemonInfo([]);
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
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Team</p>
          <div className="flex flex-wrap gap-3">
            {pokemonInfo.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 border border-white/10 px-2 py-1">
                {p.sprite && <img src={p.sprite} alt={p.name} className="w-6 h-6 pixelated" />}
                <span className="text-[10px] capitalize">{p.name}</span>
                <div className="flex gap-0.5 ml-1">
                  {p.types.map((t) => (
                    <span key={t} className={`text-[8px] px-1 py-0.5 capitalize ${TYPE_COLORS[t]} text-black`}>
                      {typeDisplayName(t)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
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
                  <span key={t} className={`text-[10px] px-2 py-1 capitalize ${TYPE_COLORS[t]} text-black font-medium`}>
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
                  <span key={t} className={`text-[10px] px-2 py-1 capitalize ${TYPE_COLORS[t]} text-black font-medium`}>
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
              const score = resistCount + immuneCount - weakCount;
              return (
                <div key={t} className="text-center border border-white/5 py-1.5">
                  <span className={`text-[8px] px-1.5 py-0.5 capitalize ${TYPE_COLORS[t]} text-black`}>
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
              return (
                <div key={t} className="text-center border border-white/5 py-1.5">
                  <span className={`text-[8px] px-1.5 py-0.5 capitalize ${TYPE_COLORS[t]} text-black`}>
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
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
