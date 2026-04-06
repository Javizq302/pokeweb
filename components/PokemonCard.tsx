"use client";

import { useEffect, useState } from "react";

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
}

interface Props {
  pokemon: TeamPokemon;
  onRemove: () => void;
  onEdit: () => void;
}

export default function PokemonCard({ pokemon, onRemove, onEdit }: Props) {
  const [sprite, setSprite] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pokemon/${pokemon.pokemonName}`)
      .then((r) => r.json())
      .then((d) => setSprite(d.sprites?.front || null))
      .catch(() => {});
  }, [pokemon.pokemonName]);

  const moves = [pokemon.move1, pokemon.move2, pokemon.move3, pokemon.move4].filter(Boolean);

  return (
    <div className="border border-white/10 p-3 group relative">
      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-[10px] text-white/40 hover:text-white">edit</button>
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
        {pokemon.item && <p>@ {pokemon.item}</p>}
        {pokemon.ability && <p>{pokemon.ability}</p>}
        {pokemon.nature && <p>{pokemon.nature}</p>}
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
    </div>
  );
}
