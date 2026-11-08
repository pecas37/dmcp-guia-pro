import { useState, useEffect } from "react";
import { obtenerMiDigimon, obtenerNotas, guardarNotas } from "../utils/almacenamiento";
import { playClickSound } from "../utils/sonidos";

// Añadimos vistaActiva para forzar la recarga
export default function NotasDashboard({ onVolver, vistaActiva }: { onVolver: () => void, vistaActiva: string }) {
  const [miDigimon, setMiDigimon] = useState<string | null>(null);
  const [notas, setNotas] = useState<any[]>([]);
  const [notaActiva, setNotaActiva] = useState<any | null>(null);
  const [textoEditando, setTextoEditando] = useState("");

  useEffect(() => {
    // Se ejecuta cada vez que entras a la vista notas
    const digi = obtenerMiDigimon();
    setMiDigimon(digi);
    if (digi) {
      const notasGuardadas = obtenerNotas(digi);
      setNotas(notasGuardadas);
      if (notasGuardadas.length > 0) {
        setNotaActiva(notasGuardadas[0]);
        setTextoEditando(notasGuardadas[0].texto);
      } else {
        setNotaActiva(null);
        setTextoEditando("");
      }
    }
  }, [vistaActiva]);

  const crearNota = () => {
    playClickSound();
    const nuevaNota = { id: Date.now().toString(), texto: "", fecha: new Date().toISOString() };
    const nuevasNotas = [nuevaNota, ...notas];
    setNotas(nuevasNotas);
    setNotaActiva(nuevaNota);
    setTextoEditando("");
    if (miDigimon) guardarNotas(miDigimon, nuevasNotas);
  };

    const guardarNotaActual = () => {
      playClickSound();
      if (!notaActiva) return;
      const notasActualizadas = notas.map(n => n.id === notaActiva.id ? { ...n, texto: textoEditando, fecha: new Date().toISOString() } : n);
      setNotas(notasActualizadas);
      setNotaActiva(notasActualizadas.find(n => n.id === notaActiva.id));
      if (miDigimon) guardarNotas(miDigimon, notasActualizadas);
      alert("Nota guardada.");
    };

    const borrarNotaActual = () => {
      playClickSound();
      if (!notaActiva) return;
      const nuevasNotas = notas.filter(n => n.id !== notaActiva.id);
      setNotas(nuevasNotas);
      if (nuevasNotas.length > 0) {
        setNotaActiva(nuevasNotas[0]);
        setTextoEditando(nuevasNotas[0].texto);
      } else {
        setNotaActiva(null);
        setTextoEditando("");
      }
      if (miDigimon) guardarNotas(miDigimon, nuevasNotas);
    };

      const copiarNota = async () => {
        playClickSound();
        try {
          await navigator.clipboard.writeText(textoEditando);
          alert("Nota copiada al portapapeles.");
        } catch (e) { console.error(e); }
      };

      const pegarNota = async () => {
        playClickSound();
        try {
          const texto = await navigator.clipboard.readText();
          setTextoEditando(prev => prev + texto);
        } catch (e) { console.error(e); alert("No se pudo pegar."); }
      };

      return (
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in h-full flex flex-col pb-10">
        <div className="flex justify-start">
        <button onClick={onVolver} className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2">
        <span>←</span> Volver a la Guía
        </button>
        </div>

        <div className="text-center mb-2">
        <h2 className="text-lg font-bold text-white text-glow">Bloc de Notas</h2>
        {miDigimon ? (
          <p className="text-[10px] text-slate-400 mt-0.5">Apuntes para: <span className="text-blue-400 font-bold">{miDigimon}</span></p>
        ) : (
          <p className="text-[10px] text-slate-500 mt-0.5">Asigna un Digimon en la Guía para guardar notas.</p>
        )}
        </div>

        {!miDigimon ? (
          <div className="text-center py-10 opacity-50 text-sm text-slate-400 flex-1 flex items-center justify-center">
          Necesitas asignar un Digimon primero para usar el bloc de notas.
          </div>
        ) : (
          <div className="flex gap-4 flex-1 overflow-hidden" style={{ minHeight: '400px' }}>
          <div className="w-1/3 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-col">
          <div className="p-2 border-b border-slate-800">
          <button onClick={crearNota} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-1.5 rounded transition-colors">+ Nueva Nota</button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {notas.length === 0 ? (<p className="text-center text-slate-500 text-[10px] mt-4">No hay notas.</p>) : (
            notas.map(n => (
              <button key={n.id} onClick={() => { playClickSound(); setNotaActiva(n); setTextoEditando(n.texto); }} className={`w-full text-left p-2 rounded border text-xs truncate transition-colors ${notaActiva?.id === n.id ? "bg-blue-600/20 border-blue-500/50 text-blue-300" : "bg-slate-950/50 border-slate-800 text-slate-400 hover:bg-slate-800"}`}>
              {n.texto.substring(0, 20) || "Nota vacía..."}...
              </button>
            ))
          )}
          </div>
          </div>
          <div className="w-2/3 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-col">
          {notaActiva ? (
            <>
            <div className="flex justify-between items-center p-2 border-b border-slate-800">
            <span className="text-[10px] text-slate-500">{new Date(notaActiva.fecha).toLocaleString()}</span>
            <div className="flex gap-2">
            <button onClick={copiarNota} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">Copiar</button>
            <button onClick={pegarNota} className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">Pegar</button>
            <button onClick={borrarNotaActual} className="text-[10px] bg-red-900/50 hover:bg-red-800 px-2 py-1 rounded text-red-300">Borrar</button>
            </div>
            </div>
            <textarea value={textoEditando} onChange={e => setTextoEditando(e.target.value)} className="flex-1 bg-transparent text-sm text-white p-4 resize-none focus:outline-none custom-scrollbar" placeholder="Escribe aquí..." />
            <div className="p-2 border-t border-slate-800">
            <button onClick={guardarNotaActual} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded text-xs">Guardar Nota</button>
            </div>
            </>
          ) : (<div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Selecciona o crea una nota.</div>)}
          </div>
          </div>
        )}
        </div>
      );
}
