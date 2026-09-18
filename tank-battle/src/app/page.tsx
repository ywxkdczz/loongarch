import TankGame from "@/components/TankGame";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center">
      <h1 className="mt-6 text-2xl font-bold tracking-widest text-slate-100">
        熙熙大战 <span className="text-emerald-400">TANK BATTLE</span>
      </h1>
      <TankGame />
    </main>
  );
}
