"use client";

import { useEffect, useState, useCallback } from "react";
import FolderList from "@/components/FolderList";
import TeamView from "@/components/TeamView";
import ShowdownModal from "@/components/ShowdownModal";

interface Folder {
  id: number;
  name: string;
  teams: { id: number; name: string }[];
}

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
  folderId: number;
  pokemon: TeamPokemon[];
}

export default function EquiposPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportPaste, setExportPaste] = useState("");

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/folders");
    setFolders(await res.json());
  }, []);

  const loadTeam = useCallback(async (teamId: number) => {
    const res = await fetch(`/api/teams/${teamId}`);
    setSelectedTeam(await res.json());
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = async () => {
    const name = prompt("Folder name:");
    if (!name) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    loadFolders();
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("Delete this folder and all its teams?")) return;
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (selectedTeam && folders.find((f) => f.id === id)?.teams.some((t) => t.id === selectedTeam.id)) {
      setSelectedTeam(null);
    }
    loadFolders();
  };

  const createTeam = async (folderId: number) => {
    const name = prompt("Team name:");
    if (!name) return;
    await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, folderId }),
    });
    loadFolders();
  };

  const deleteTeam = async (id: number) => {
    if (!confirm("Delete this team?")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    if (selectedTeam?.id === id) setSelectedTeam(null);
    loadFolders();
  };

  const handleImport = async (paste: string) => {
    if (!selectedTeam) return;
    await fetch(`/api/teams/${selectedTeam.id}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paste }),
    });
    setShowImport(false);
    loadTeam(selectedTeam.id);
  };

  const handleExport = async () => {
    if (!selectedTeam) return;
    const res = await fetch(`/api/teams/${selectedTeam.id}/export`);
    const data = await res.json();
    setExportPaste(data.paste);
    setShowExport(true);
  };

  const removePokemon = async (slot: number) => {
    if (!selectedTeam) return;
    await fetch(`/api/teams/${selectedTeam.id}/pokemon?slot=${slot}`, { method: "DELETE" });
    loadTeam(selectedTeam.id);
  };

  return (
    <div className="flex gap-6 min-h-[75vh]">
      {/* Sidebar */}
      <div className="w-64 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white/50">Folders</h2>
          <button onClick={createFolder} className="text-xs border border-white/20 px-2 py-1 hover:bg-white hover:text-black transition-all">
            + New
          </button>
        </div>
        <FolderList
          folders={folders}
          selectedTeamId={selectedTeam?.id ?? null}
          onSelectTeam={loadTeam}
          onCreateTeam={createTeam}
          onDeleteTeam={deleteTeam}
          onDeleteFolder={deleteFolder}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 border-l border-white/10 pl-6">
        {selectedTeam ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">{selectedTeam.name}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowImport(true)}
                  className="text-xs border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all"
                >
                  Import
                </button>
                <button
                  onClick={handleExport}
                  className="text-xs border border-white/20 px-3 py-1.5 hover:bg-white hover:text-black transition-all"
                >
                  Export
                </button>
              </div>
            </div>
            <TeamView
              team={selectedTeam}
              onRemovePokemon={removePokemon}
              onPokemonUpdated={() => loadTeam(selectedTeam.id)}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            Select a team to view
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <ShowdownModal
          mode="import"
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {/* Export Modal */}
      {showExport && (
        <ShowdownModal
          mode="export"
          paste={exportPaste}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
