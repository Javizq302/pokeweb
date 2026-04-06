"use client";

interface Folder {
  id: number;
  name: string;
  teams: { id: number; name: string }[];
}

interface Props {
  folders: Folder[];
  selectedTeamId: number | null;
  onSelectTeam: (id: number) => void;
  onCreateTeam: (folderId: number) => void;
  onDeleteTeam: (id: number) => void;
  onDeleteFolder: (id: number) => void;
}

export default function FolderList({
  folders,
  selectedTeamId,
  onSelectTeam,
  onCreateTeam,
  onDeleteTeam,
  onDeleteFolder,
}: Props) {
  if (folders.length === 0) {
    return <p className="text-white/30 text-xs">No folders yet</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {folders.map((folder) => (
        <div key={folder.id} className="border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{folder.name}</span>
            <div className="flex gap-1">
              <button
                onClick={() => onCreateTeam(folder.id)}
                className="text-[10px] text-white/40 hover:text-white transition-colors"
                title="Add team"
              >
                +
              </button>
              <button
                onClick={() => onDeleteFolder(folder.id)}
                className="text-[10px] text-white/40 hover:text-red-400 transition-colors"
                title="Delete folder"
              >
                x
              </button>
            </div>
          </div>
          {folder.teams.length === 0 ? (
            <p className="text-white/20 text-[10px]">Empty</p>
          ) : (
            <div className="flex flex-col gap-1">
              {folder.teams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs transition-all ${
                    selectedTeamId === team.id
                      ? "bg-white text-black"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span onClick={() => onSelectTeam(team.id)} className="flex-1">
                    {team.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTeam(team.id);
                    }}
                    className={`text-[10px] transition-colors ${
                      selectedTeamId === team.id
                        ? "text-black/40 hover:text-red-600"
                        : "text-white/30 hover:text-red-400"
                    }`}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
