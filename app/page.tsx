import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-12">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tighter mb-3">POKEWEB</h1>
        <p className="text-white/50 text-sm">Competitive team manager</p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/equipos"
          className="border border-white/20 px-6 py-3 text-sm hover:bg-white hover:text-black transition-all"
        >
          Teams
        </Link>
        <Link
          href="/calculadora"
          className="border border-white/20 px-6 py-3 text-sm hover:bg-white hover:text-black transition-all"
        >
          Calculator
        </Link>
      </div>
    </div>
  );
}
