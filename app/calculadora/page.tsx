"use client";

export default function CalculadoraPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Type Calculator</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-white/10 p-6 flex flex-col items-center justify-center h-40">
          <p className="text-sm font-bold mb-1">Attack</p>
          <p className="text-[10px] text-white/40">Coming in Fase 5</p>
        </div>
        <div className="border border-white/10 p-6 flex flex-col items-center justify-center h-40">
          <p className="text-sm font-bold mb-1">Defense</p>
          <p className="text-[10px] text-white/40">Coming in Fase 5</p>
        </div>
        <div className="border border-white/10 p-6 flex flex-col items-center justify-center h-40">
          <p className="text-sm font-bold mb-1">Team Coverage</p>
          <p className="text-[10px] text-white/40">Coming in Fase 5</p>
        </div>
      </div>
    </div>
  );
}
