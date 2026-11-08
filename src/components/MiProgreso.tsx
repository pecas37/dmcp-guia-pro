import { useState, useEffect } from "react";
import { obtenerProgreso, guardarProgreso } from "../utils/almacenamiento";
import { playClickSound } from "../utils/sonidos";
import { playNotificacionSound, mostrarNotificacion } from "../utils/notificaciones";

export default function MiProgreso() {
  const [progreso, setProgreso] = useState<any>(null);
  const [segundos, setSegundos] = useState(0);
  const [activo, setActivo] = useState(false);
  const [tiempoObjetivo, setTiempoObjetivo] = useState(0);

  useEffect(() => {
    setProgreso(obtenerProgreso());
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (activo) {
      interval = setInterval(() => {
        setSegundos(s => {
          if (s + 1 >= tiempoObjetivo) {
            setActivo(false);
            playNotificacionSound();
            mostrarNotificacion("¡Evolución lista!", "Tu Digimon está listo para evolucionar.");
            return s + 1;
          }
          return s + 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activo, tiempoObjetivo]);

  const handleCambio = (campo: string, valor: any) => {
    const nuevo = { ...progreso, [campo]: valor };
    setProgreso(nuevo);
    guardarProgreso(nuevo);
  };

  const toggleTimer = () => {
    playClickSound();
    setActivo(!activo);
  };

  const resetTimer = () => {
    playClickSound();
    setActivo(false);
    setSegundos(0);
  };

  const formatTime = (totalSegundos: number) => {
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSegundos % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (!progreso) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white text-glow">Mi Progreso</h2>
        <p className="text-slate-400 text-sm mt-1">
          {progreso.digimon ? `Digimon actual: ${progreso.digimon}` : "Asigna un Digimon en la Guía primero."}
        </p>
      </div>

      {/* CONTADOR DE EVOLUCIÓN */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Temporizador de Evolución</h3>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-mono text-white">{formatTime(segundos)}</div>
          <div className="flex gap-2">
            <button onClick={toggleTimer} className={`px-4 py-2 rounded text-xs font-bold ${activo ? "bg-red-600/50 text-red-200" : "bg-green-600/50 text-green-200"}`}>
              {activo ? "Pausar" : "Iniciar"}
            </button>
            <button onClick={resetTimer} className="bg-slate-800 text-slate-300 px-4 py-2 rounded text-xs font-bold">Reset</button>
          </div>
        </div>
        <div className="mt-2">
          <label className="text-[10px] text-slate-500">Objetivo (Horas)</label>
          <input type="number" min="1" max="100" value={tiempoObjetivo / 3600 || ""} onChange={e => setTiempoObjetivo((parseInt(e.target.value) || 1) * 3600)} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white mt-1" />
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Estadísticas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Entrenamientos", key: "entrenamientos" },
            { label: "Batallas", key: "batallas" },
            { label: "Victorias", key: "victorias" },
            { label: "Errores", key: "errores" },
            { label: "ATK", key: "atk" },
            { label: "DEF", key: "def" },
            { label: "DEX", key: "dex" },
            { label: "Peso (g)", key: "peso" },
            { label: "Edad", key: "edad" },
          ].map((item) => (
            <div key={item.key}>
              <label className="text-[10px] text-slate-500 uppercase">{item.label}</label>
              <input 
                type="number" 
                min="0"
                value={progreso[item.key]} 
                onChange={(e) => handleCambio(item.key, parseInt(e.target.value) || 0)} 
                className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white" 
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Luz</label>
            <select value={progreso.luz} onChange={(e) => handleCambio("luz", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white">
              <option>Encendida</option>
              <option>Apagada</option>
              <option>Indiferente</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Ánimo</label>
            <select value={progreso.animo} onChange={(e) => handleCambio("animo", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white">
              <option>Alegre</option>
              <option>Normal</option>
              <option>Triste</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}