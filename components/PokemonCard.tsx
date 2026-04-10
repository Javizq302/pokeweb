"use client";

import { useEffect, useState, useMemo } from "react";
import { STAT_KEYS, STAT_LABELS, calcAllStats, getNatureInfo, POKEAPI_STAT_MAP } from "@/lib/stats";
import { getItemSpriteUrl } from "@/components/PokemonEditor";

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
  pokemon: TeamPokemon;
  onRemove: () => void;
  onEdit: (baseStats: Record<string, number> | null) => void;
}

function parseJson(s: string | null, def: Record<string, number>): Record<string, number> {
  if (!s) return def;
  try { return JSON.parse(s); } catch { return def; }
}

export default function PokemonCard({ pokemon, onRemove, onEdit }: Props) {
  const [sprite, setSprite] = useState<string | null>(null);
  const [baseStats, setBaseStats] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    fetch(`/api/pokemon/${pokemon.pokemonName}`)
      .then((r) => r.json())
      .then((d) => {
        setSprite(d.sprites?.front || null);
        if (d.stats) {
          const mapped: Record<string, number> = {};
          for (const [key, val] of Object.entries(d.stats)) {
            const statKey = POKEAPI_STAT_MAP[key];
            if (statKey) mapped[statKey] = val as number;
          }
          setBaseStats(mapped);
        }
      })
      .catch(() => { });
  }, [pokemon.pokemonName]);

  const evs = useMemo(() => parseJson(pokemon.evs, {}), [pokemon.evs]);
  const ivs = useMemo(() => parseJson(pokemon.ivs, { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }), [pokemon.ivs]);

  const finalStats = useMemo(() => {
    if (!baseStats) return null;
    return calcAllStats(baseStats, evs, ivs, pokemon.level, pokemon.nature);
  }, [baseStats, evs, ivs, pokemon.level, pokemon.nature]);

  const natureInfo = useMemo(() => getNatureInfo(pokemon.nature), [pokemon.nature]);

  const moves = [pokemon.move1, pokemon.move2, pokemon.move3, pokemon.move4].filter(Boolean);

  return (
    <div className="border border-white/10 p-3 group relative">
      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(baseStats)} className="text-[10px] text-white/40 hover:text-white">edit</button>
        <button onClick={onRemove} className="text-[10px] text-white/40 hover:text-red-400">x</button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {sprite && (
          <img src={sprite} alt={pokemon.pokemonName} className="w-10 h-10 pixelated" />
        )}
        <div>
          <p className="text-xs font-bold capitalize">{pokemon.nickname || pokemon.pokemonName}</p>
          {pokemon.nickname && (
            <p className="text-[10px] text-white/40 capitalize">{pokemon.pokemonName}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="text-[10px] text-white/50 space-y-0.5">
        {pokemon.item && (
          <p className="flex items-center gap-1">
            <img
              src={getItemSpriteUrl(pokemon.item)}
              alt={pokemon.item}
              className="w-4 h-4 pixelated inline-block"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span>@ {pokemon.item}</span>
          </p>
        )}
        {pokemon.ability && <p>{pokemon.ability}</p>}
        {pokemon.nature && <p>{pokemon.nature}</p>}
        {pokemon.teraType && <p>Tera: {pokemon.teraType}</p>}
        {pokemon.level && <p>Lv.{pokemon.level}</p>}
      </div>

      {/* Moves */}
      {moves.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {moves.map((move, i) => (
            <span key={i} className="text-[10px] border border-white/10 px-1.5 py-0.5">
              {move}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      {finalStats && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="grid grid-cols-6 gap-0.5">
            {STAT_KEYS.map((key) => {
              const isBoost = natureInfo.boosted === key;
              const isLower = natureInfo.lowered === key;
              return (
                <div key={key} className="text-center">
                  <p className="text-[8px] text-white/25">{STAT_LABELS[key]}</p>
                  <p className={`text-[10px] font-bold ${isBoost ? "text-green-400" : isLower ? "text-red-400" : "text-white/60"}`}>
                    {finalStats[key]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
