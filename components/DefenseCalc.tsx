"use client";

import { useState, useEffect, useRef } from "react";
import { ALL_TYPES, getDefensiveMatchups, groupByEffectiveness, typeDisplayName, TYPE_HEX_COLORS } from "@/lib/types";

interface PokemonListItem {
  name: string;
  id: number;
}

export default function DefenseCalc() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [pokemonSearch, setPokemonSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sprite, setSprite] = useState<string | null>(null);

  // Autocomplete state
  const [allPokemon, setAllPokemon] = useState<PokemonListItem[]>([]);
  const [suggestions, setSuggestions] = useState<PokemonListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Fetch full pokemon list once
  useEffect(() => {
    fetch("/api/pokemon-list")
      .then((r) => r.json())
      .then((data: PokemonListItem[]) => setAllPokemon(data))
      .catch(() => {});
  }, []);

  // Filter suggestions as user types
  useEffect(() => {
    const query = pokemonSearch.trim().toLowerCase();
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
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
    setSuggestions(filtered);
    if (document.activeElement === inputRef.current) {
      setShowSuggestions(filtered.length > 0);
    }
    setSelectedIndex(-1);
  }, [pokemonSearch, allPokemon]);

  // Close suggestions on click outside
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
    setPokemonSearch(name);
    setShowSuggestions(false);
    setLoading(true);
    setSprite(null);
    try {
      const res = await fetch(`/api/pokemon/${name.trim().toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        const types = (data.types as string[]).filter(Boolean);
        setSelectedTypes(types);
        setSprite(data.sprites?.front || null);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        selectPokemon(pokemonSearch);
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
        selectPokemon(suggestions[selectedIndex].name);
      } else if (suggestions.length > 0) {
        selectPokemon(suggestions[0].name);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Toggle a type in the selection (max 2)
  const toggleType = (type: string) => {
    // Clear pokemon search when manually selecting types
    setPokemonSearch("");
    setSprite(null);

    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Deselect
        return prev.filter((t) => t !== type);
      }
      if (prev.length >= 2) {
        // Replace the second type
        return [prev[0], type];
      }
      return [...prev, type];
    });
  };

  const clearTypes = () => {
    setSelectedTypes([]);
    setPokemonSearch("");
    setSprite(null);
  };

  const matchups = selectedTypes.length > 0 ? getDefensiveMatchups(selectedTypes) : null;
  const groups = matchups ? groupByEffectiveness(matchups) : null;

  return (
    <div>
      <p className="text-[10px] text-white/40 mb-3">Search a Pokemon or pick types to see weaknesses &amp; resistances.</p>

      {/* Pokemon search with autocomplete */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={pokemonSearch}
            onChange={(e) => setPokemonSearch(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search Pokemon..."
            className="flex-1 bg-black border border-white/20 px-2 py-1.5 text-xs focus:border-white/50 outline-none placeholder:text-white/20"
          />
          <button
            onClick={() => selectPokemon(pokemonSearch)}
            disabled={loading}
            className="text-xs border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all disabled:opacity-30"
          >
            {loading ? "..." : "Search"}
          </button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 left-0 right-12 mt-0.5 bg-black border border-white/20 max-h-60 overflow-y-auto"
          >
            {suggestions.map((p, i) => (
              <button
                key={p.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPokemon(p.name);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full text-left px-2 py-1.5 text-xs capitalize flex items-center gap-2 transition-colors ${
                  i === selectedIndex
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

      {/* Type grid */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] text-white/50 uppercase tracking-wider">
            Select types {selectedTypes.length > 0 && `(${selectedTypes.length}/2)`}
          </label>
          {selectedTypes.length > 0 && (
            <button
              onClick={clearTypes}
              className="text-[10px] text-white/30 hover:text-white transition-colors"
            >
              clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {ALL_TYPES.map((type) => {
            const isSelected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                style={{
                  backgroundColor: isSelected ? TYPE_HEX_COLORS[type] : "transparent",
                  borderColor: TYPE_HEX_COLORS[type],
                }}
                className={`text-[10px] py-1.5 capitalize font-medium border transition-all ${
                  isSelected
                    ? "text-black scale-105"
                    : "text-white/50 hover:text-white hover:scale-105"
                }`}
              >
                {typeDisplayName(type)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected types display */}
      {selectedTypes.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {sprite && <img src={sprite} alt="" className="w-10 h-10 pixelated" />}
          <div className="flex gap-1.5">
            {selectedTypes.map((t) => (
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
