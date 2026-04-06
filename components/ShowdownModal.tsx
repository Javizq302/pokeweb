"use client";

import { useState } from "react";

interface ImportProps {
  mode: "import";
  onClose: () => void;
  onImport: (paste: string) => void;
  paste?: undefined;
}

interface ExportProps {
  mode: "export";
  onClose: () => void;
  paste: string;
  onImport?: undefined;
}

type Props = ImportProps | ExportProps;

export default function ShowdownModal(props: Props) {
  const [text, setText] = useState(props.mode === "export" ? props.paste : "");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={props.onClose}>
      <div
        className="bg-black border border-white/20 p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider">
            {props.mode === "import" ? "Import Showdown" : "Export Showdown"}
          </h3>
          <button onClick={props.onClose} className="text-white/40 hover:text-white text-xs">close</button>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={props.mode === "export"}
          placeholder={props.mode === "import" ? "Paste your Pokémon Showdown team here..." : ""}
          className="w-full h-64 bg-black border border-white/20 p-3 text-xs font-mono resize-none focus:border-white/50 outline-none placeholder:text-white/20"
        />

        <div className="flex gap-2 mt-4">
          {props.mode === "import" ? (
            <button
              onClick={() => props.onImport!(text)}
              disabled={!text.trim()}
              className="flex-1 border border-white/20 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-all disabled:opacity-30"
            >
              Import
            </button>
          ) : (
            <button
              onClick={handleCopy}
              className="flex-1 border border-white/20 py-2 text-xs font-bold uppercase tracking-wider hover:bg-white hover:text-black transition-all"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
