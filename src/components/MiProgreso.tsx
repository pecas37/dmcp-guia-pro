import { useState, useEffect } from "react";
import { obtenerProgreso, guardarProgreso } from "../utils/almacenamiento";
import { playClickSound } from "../utils/sonidos";
import { playNotificacionSound, mostrarNotificacion } from "../utils/notificaciones";
import { TIEMPOS_EVOLUCION } from "../data/digimonData";

export default function MiProgreso() {
  const [progreso, setProgreso] = useState<any>(null);
  const [segundos, setSegundos] = useState(0);
  const [activo, setActivo] = useState(false);
  const [etapaObjetivo, setEtapaObjetivo] = useState<string | null>(null);
  const [alarmaSonando, setAlarmaSonando] = useState(false);

  useEffect(() => {
    setProgreso(obtenerProgreso());
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (activo && segundos > 0) {
      interval = setInterval(() => {
        setSegundos((s) => {
          if (s <= 1) {
            setActivo(false);
            setAlarmaSonando(true);
            playNotificacionSound();
            mostrarNotificacion("¡Evolución lista!", "Tu Digimon ha completado su tiempo.");
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activo, segundos]);

  const handleCambio = (campo: string, valor: any) => {
    const nuevo = { ...progreso, [campo]: valor };
    setProgreso(nuevo);
    guardarProgreso(nuevo);
  };

  const iniciarTimer = () => {
    playClickSound();
    if (segundos > 0) {
      setActivo(true);
      setAlarmaSonando(false);
    }
  };

  const resetTimer = () => {
    playClickSound();
    setActivo(false);
    setSegundos(0);
    setEtapaObjetivo(null);
    setAlarmaSonando(false);
  };

  const seleccionarEtapa = (etapaActual: string) => {
    if (activo || alarmaSonando) return;
    playClickSound();
    const horas = TIEMPOS_EVOLUCION[etapaActual];
    if (!horas) return;

    // Mapeamos la etapa actual a la etapa a la que va a evolucionar
    const mapaEtapas: Record<string, string> = {
      "BB1": "BB2",
      "BB2": "CHILD",
      "CHILD": "ADULT",
      "ADULT": "PERFECT",
      "PERFECT": "ULTIMATE",
      "ULTIMATE": "SUPER ULTIMATE"
    };

    setEtapaObjetivo(mapaEtapas[etapaActual] || etapaActual);
    setSegundos(horas * 3600);
  };

  const formatTime = (totalSegundos: number) => {
    const h = Math.floor(totalSegundos / 3600).toString().padStart(2, "0");
    const m = Math.floor((totalSegundos % 3600) / 60).toString().padStart(2, "0");
    const s = (totalSegundos % 60).toString().padStart(2, "0");
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

    <div className="text-center mb-4">
    <div className={`text-5xl font-mono tracking-widest ${alarmaSonando ? "text-red-500 animate-pulse" : "text-white"}`}>
    {formatTime(segundos)}
    </div>
    {etapaObjetivo && (
      <div className="mt-3 bg-slate-950/50 p-2 rounded border border-slate-800 inline-block">
      <p className="text-xs text-blue-400 font-bold">
      Evolucionando a {etapaObjetivo}
      </p>
      </div>
    )}
    </div>

    <div className="flex justify-center gap-3 mb-6">
    <button
    onClick={iniciarTimer}
    disabled={activo || segundos === 0 || alarmaSonando}
    className="bg-green-600/20 hover:bg-green-600 text-green-400 disabled:opacity-30 disabled:hover:bg-green-600/20 px-6 py-2 rounded-lg text-sm font-bold transition-all"
    >
    Iniciar
    </button>
    <button
    onClick={resetTimer}
    className="bg-red-600/20 hover:bg-red-600 text-red-400 px-6 py-2 rounded-lg text-sm font-bold transition-all"
    >
    Reiniciar
    </button>
    </div>

    {/* BOTONES DE ETAPA */}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {Object.entries(TIEMPOS_EVOLUCION).map(([etapaActual, horas]) => {
      // Mapeamos el nombre para mostrarlo en el botón
      const mapaEtapas: Record<string, string> = {
        "BB1": "BB2",
        "BB2": "CHILD",
        "CHILD": "ADULT",
        "ADULT": "PERFECT",
        "PERFECT": "ULTIMATE",
        "ULTIMATE": "SUPER ULTIMATE"
      };
      const etapaDestino = mapaEtapas[etapaActual];

      return (
        <button
        key={etapaActual}
        onClick={() => seleccionarEtapa(etapaActual)}
        disabled={activo || alarmaSonando || etapaObjetivo !== null}
        className={`py-2 px-3 rounded text-xs font-bold border transition-all flex flex-col items-center justify-center ${
          etapaObjetivo === etapaDestino
          ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
          : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 disabled:opacity-50"
        }`}
        >
        <span>{etapaDestino}</span>
        <span className="text-[9px] font-normal opacity-70 mt-0.5">{horas} Horas</span>
        </button>
      );
    })}
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
