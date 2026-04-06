"use client";

import { useState } from "react";
import PokemonCard from "./PokemonCard";
import PokemonEditor from "./PokemonEditor";

interface TeamPokemon {
  id: number;
  pokemonName: string;
  slot: number;
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

interface Team {
  id: number;
  name: string;
  pokemon: TeamPokemon[];
}

interface Props {
  team: Team;
  onRemovePokemon: (slot: number) => void;
  onPokemonUpdated: () => void;
}

export default function TeamView({ team, onRemovePokemon, onPokemonUpdated }: Props) {
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const slots = [1, 2, 3, 4, 5, 6];

  const getPokemonForSlot = (slot: number) =>
    team.pokemon.find((p) => p.slot === slot) || null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {slots.map((slot) => {
          const pokemon = getPokemonForSlot(slot);
          return (
            <div key={slot}>
              {pokemon ? (
                <PokemonCard
                  pokemon={pokemon}
                  onRemove={() => onRemovePokemon(slot)}
                  onEdit={() => setEditingSlot(slot)}
                />
              ) : (
                <button
                  onClick={() => setEditingSlot(slot)}
                  className="w-full h-32 border border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs hover:border-white/30 hover:text-white/40 transition-all"
                >
                  + Slot {slot}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {editingSlot !== null && (
        <PokemonEditor
          teamId={team.id}
          slot={editingSlot}
          existing={getPokemonForSlot(editingSlot)}
          onClose={() => setEditingSlot(null)}
          onSaved={() => {
            setEditingSlot(null);
            onPokemonUpdated();
          }}
        />
      )}
    </>
  );
}
