import { useState, useEffect } from "react";
import { obtenerMiDigimon, agregarLog } from "../utils/almacenamiento";
import { requisitos, listaCompleta } from "../data/digimonData";
import { playClickSound } from "../utils/sonidos";

export default function SimuladorDashboard() {
  const [miDigimon, setMiDigimon] = useState<string | null>(null);
  const [stats, setStats] = useState({ atk: 0, def: 0, dex: 0, entrenamientos: 0, batallas: 0, victorias: 0, errores: 0, luz: "Encendida", animo: "Alegre", peso: 0, edad: 0 });
  const [resultados, setResultados] = useState<any[]>([]);

  useEffect(() => { setMiDigimon(obtenerMiDigimon()); }, []);

  const calcularEvoluciones = () => {
    playClickSound();
    if (!miDigimon) return;
    agregarLog("Simulación", `Simuló evoluciones para ${miDigimon}`);
    
    const filaPrincipal = listaCompleta.find((d: any) => d.Digimon === miDigimon);
    if (!filaPrincipal) return;
    const etapaActual = filaPrincipal.Etapa;
    let col = "";
    if (etapaActual === "BB1") col = "De BB1 a BB2";
    else if (etapaActual === "BB2") col = "De BB2 a CHILD";
    else if (etapaActual === "CHILD") col = "De CHILD a ADULT";
    else if (etapaActual === "ADULT") col = "De ADULT a PERFECT";
    else if (etapaActual === "PERFECT") col = "De PERFECT a ULTIMATE";
    else if (etapaActual === "ULTIMATE") col = "De ULTIMATE a SUPER ULTIMATE";
    else return;

    const evolucionesPosibles = listaCompleta
      .filter((f: any) => f.Digimon === miDigimon && f["Evoluciona A"] && f["Evoluciona A"].trim() !== "")
      .map((fila: any) => {
        // CORRECCIÓN AQUÍ: Añadido 'as any' para evitar el error de TypeScript
        const reqText = (requisitos.find((r: any) => r.RAMA === fila.Rama) as any)?.[col] || "";
        const reqLower = reqText.toLowerCase();
        let cumple = true; let faltantes: string[] = [];

        if (reqLower.includes("(atk)") && (stats.atk === 0 || stats.atk < stats.def || stats.atk < stats.dex)) { cumple = false; faltantes.push("ATK > DEF/DEX"); }
        if (reqLower.includes("(def)") && (stats.def === 0 || stats.def < stats.atk || stats.def < stats.dex)) { cumple = false; faltantes.push("DEF > ATK/DEX"); }
        if (reqLower.includes("(dex)") && (stats.dex === 0 || stats.dex < stats.atk || stats.dex < stats.def)) { cumple = false; faltantes.push("DEX > ATK/DEF"); }
        if (reqLower.includes("estadisticas equilibradas") && (stats.atk !== stats.def || stats.atk !== stats.dex || stats.atk === 0)) { cumple = false; faltantes.push("Stats Iguales"); }

        const mEntRango = reqLower.match(/de (\d+) a (\d+)/);
        const mEntMin = reqLower.match(/(\d+) o m[áa]s/);
        const mEntAlMenos = reqLower.match(/al menos (\d+)/);
        if (reqLower.includes("entrenado")) {
          if (mEntRango && (stats.entrenamientos < parseInt(mEntRango[1]) || stats.entrenamientos > parseInt(mEntRango[2]))) { cumple = false; faltantes.push(`Entren. ${mEntRango[1]}-${mEntRango[2]}`); }
          else if (mEntMin && stats.entrenamientos < parseInt(mEntMin[1])) { cumple = false; faltantes.push(`Entren. ${mEntMin[1]}+`); }
          else if (mEntAlMenos && stats.entrenamientos < parseInt(mEntAlMenos[1])) { cumple = false; faltantes.push(`Entren. ${mEntAlMenos[1]}+`); }
        }
        const mBat = reqLower.match(/(\d+) batallas/);
        if (mBat && stats.batallas < parseInt(mBat[1])) { cumple = false; faltantes.push(`Batallas ${mBat[1]}+`); }
        if (reqLower.includes("luz encendida") && stats.luz !== "Encendida") { cumple = false; faltantes.push("Luz On"); }
        if (reqLower.includes("luz apagada") && stats.luz !== "Apagada") { cumple = false; faltantes.push("Luz Off"); }
        
        const mErrMenos = reqLower.match(/menos de (\d+)/);
        const mErrMas = reqLower.match(/m[áa]s de (\d+)/);
        if (reqLower.includes("errores de cuidado")) {
          if (mErrMenos && stats.errores >= parseInt(mErrMenos[1])) { cumple = false; faltantes.push(`Err < ${mErrMenos[1]}`); }
          else if (mErrMas && stats.errores <= parseInt(mErrMas[1])) { cumple = false; faltantes.push(`Err > ${mErrMas[1]}`); }
        }
        const mWin = reqLower.match(/mayor al (\d+)%/);
        if (mWin) { const wr = stats.batallas > 0 ? (stats.victorias / stats.batallas) * 100 : 0; if (wr <= parseInt(mWin[1])) { cumple = false; faltantes.push(`WinRate >${mWin[1]}%`); } }
        
        const mAnimo = reqLower.match(/animo (\w+)/);
        if (mAnimo && stats.animo !== mAnimo[1]) { cumple = false; faltantes.push(`Ánimo ${mAnimo[1]}`); }
        
        const mPesoRango = reqLower.match(/entre (\d+) y (\d+)/);
        if (mPesoRango && (stats.peso < parseInt(mPesoRango[1]) || stats.peso > parseInt(mPesoRango[2]))) { cumple = false; faltantes.push(`Peso ${mPesoRango[1]}-${mPesoRango[2]}g`); }
        
        const mEdad = reqLower.match(/(\d+) a[ñn]os/);
        if (mEdad && stats.edad < parseInt(mEdad[1])) { cumple = false; faltantes.push(`Edad ${mEdad[1]} años`); }

        return { evolucionaA: fila["Evoluciona A"], rama: fila.Rama, requisito: reqText, cumple, faltantes };
      });
    setResultados(evolucionesPosibles);
  };

  if (!miDigimon) return <div className="text-center py-10 opacity-50 text-sm text-slate-400">Asigna un Digimon primero.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-white text-glow">Simulador de Requisitos</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">Evaluando: <span className="text-blue-400 font-bold">{miDigimon}</span></p>
      </div>
      <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          <div><label className="text-[9px] text-slate-500 uppercase">ATK</label><input type="number" min="0" onChange={e => setStats({...stats, atk: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">DEF</label><input type="number" min="0" onChange={e => setStats({...stats, def: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">DEX</label><input type="number" min="0" onChange={e => setStats({...stats, dex: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Entren.</label><input type="number" min="0" onChange={e => setStats({...stats, entrenamientos: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Batallas</label><input type="number" min="0" onChange={e => setStats({...stats, batallas: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Victorias</label><input type="number" min="0" onChange={e => setStats({...stats, victorias: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Errores</label><input type="number" min="0" onChange={e => setStats({...stats, errores: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Peso (G)</label><input type="number" min="0" onChange={e => setStats({...stats, peso: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Edad</label><input type="number" min="0" onChange={e => setStats({...stats, edad: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" /></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Luz</label><select onChange={e => setStats({...stats, luz: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white"><option>Encendida</option><option>Apagada</option><option>Indiferente</option></select></div>
          <div><label className="text-[9px] text-slate-500 uppercase">Ánimo</label><select onChange={e => setStats({...stats, animo: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-white"><option>Alegre</option><option>Normal</option><option>Triste</option></select></div>
        </div>
        <button onClick={calcularEvoluciones} className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded text-xs transition-colors">Calcular</button>
      </div>
      <div className="space-y-2">
        {resultados.map((res, i) => (
          <div key={i} className={`bg-slate-900/40 border rounded-lg p-2.5 ${res.cumple ? "border-green-500/50" : "border-red-500/30"}`}>
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white">{res.evolucionaA}</h4>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${res.cumple ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>{res.cumple ? "Cumple" : "Falla"}</span>
            </div>
            <p className="text-[9px] text-slate-500 italic mt-0.5">{res.requisito}</p>
            {!res.cumple && <p className="text-[10px] text-red-400 mt-1">Falta: {res.faltantes.join(", ")}</p>}
          </div>
        ))}
        {resultados.length === 0 && <p className="text-center text-slate-600 text-xs mt-4">Presiona Calcular para ver resultados.</p>}
      </div>
    </div>
  );
}