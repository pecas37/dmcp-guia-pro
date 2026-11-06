import { useState, useEffect } from "react";
import { playClickSound } from "../utils/sonidos";
import { agregarLog } from "../utils/almacenamiento";

export default function Temporizador() {
  const [segundos, setSegundos] = useState(0);
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (activo) {
      interval = setInterval(() => setSegundos(s => s + 1), 1000);
    } else if (!activo && segundos !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activo, segundos]);

  const toggle = () => {
    playClickSound();
    if (!activo) {
      agregarLog("Temporizador", "Inició el temporizador");
    } else {
      agregarLog("Temporizador", "Pausó el temporizador");
    }
    setActivo(!activo);
  };

  const reset = () => {
    playClickSound();
    agregarLog("Temporizador", "Reinició el temporizador");
    setActivo(false);
    setSegundos(0);
  };

  const formatTime = (totalSegundos: number) => {
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
      <span className="text-xs font-mono text-blue-400 font-bold">{formatTime(segundos)}</span>
      <button onClick={toggle} className={`text-xs font-bold px-2 py-0.5 rounded transition-colors ${activo ? "bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white" : "bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white"}`}>{activo ? "⏸" : "▶"}</button>
      <button onClick={reset} className="text-xs font-bold bg-slate-800 text-slate-400 hover:text-white px-2 py-0.5 rounded">↺</button>
    </div>
  );
}