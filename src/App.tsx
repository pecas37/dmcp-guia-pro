import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { familias, requisitos, listaCompleta } from "./data/digimonData"; 
import { playClickSound } from "./utils/sonidos";
import { obtenerMiDigimon, guardarMiDigimon, obtenerLogs, agregarLog, borrarLogs } from "./utils/almacenamiento";
import Temporizador from "./components/Temporizador";
import SimuladorDashboard from "./components/SimuladorDashboard";
import NotasDashboard from "./components/NotasDashboard";
import ChatDashboard from "./components/ChatDashboard";

const ORDEN_ETAPAS = ["BB1", "BB2", "CHILD", "ADULT", "PERFECT", "ULTIMATE", "SUPER ULTIMATE"];
const normalizarNombre = (nombre: string) => nombre ? nombre.trim().toLowerCase() : "";

type Vista = "guia" | "simulador" | "notas" | "historial" | "chat";

function App() {
  const [vistaActiva, setVistaActiva] = useState<Vista>("guia");
  const [familiaActiva, setFamiliaActiva] = useState(familias[0] || "DEEP SAVERS");
  const [digimonSeleccionado, setDigimonSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [miDigimon, setMiDigimon] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Estados para el Toast
  const [mensajeToast, setMensajeToast] = useState<string | null>(null);
  const [visible, setVisible] = useState(false); // Controla la animación

  useEffect(() => {
    setMiDigimon(obtenerMiDigimon());
    setLogs(obtenerLogs());
  }, []);

  useEffect(() => {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.event) {
        const unlisten = tauri.event.listen('tauri://back', () => {
          if (menuAbierto) setMenuAbierto(false);
          else if (digimonSeleccionado) setDigimonSeleccionado(null);
          else if (vistaActiva !== "guia") setVistaActiva("guia");
          else tauri.app.exit();
        });
        return () => { unlisten.then((f: any) => f()); };
      }
    } catch (e) { console.log("Botón atrás no disponible."); }
  }, [menuAbierto, digimonSeleccionado, vistaActiva]);

  // Función mejorada para mostrar y ocultar el toast
  const mostrarToast = (mensaje: string) => {
    setMensajeToast(mensaje);
    setVisible(true);
    // Después de 3 segundos, iniciamos la animación de salida
    setTimeout(() => {
      setVisible(false);
      // Después de 0.4s (la duración de la animación de salida), limpiamos el mensaje
      setTimeout(() => setMensajeToast(null), 400);
    }, 3000);
  };

  const cambiarVista = (vista: Vista) => {
    playClickSound();
    agregarLog("Navegación", `Cambió a ${vista}`);
    setLogs(obtenerLogs());
    setVistaActiva(vista);
    setMenuAbierto(false);
  };

  const handleBusqueda = (texto: string) => {
    setBusqueda(texto);
    setDigimonSeleccionado(null);
    setVistaActiva("guia");
    if (texto.length > 2) {
      agregarLog("Búsqueda", `Buscó: "${texto}"`);
      setLogs(obtenerLogs());
    }
  };

  const digimonsAgrupados = useMemo(() => {
    let filtrados = listaCompleta;
    if (busqueda.trim() !== "") {
      const term = busqueda.trim().toLowerCase();
      filtrados = listaCompleta.filter((d: any) => d.Digimon.toLowerCase().includes(term));
    } else {
      filtrados = listaCompleta.filter((d: any) => d.Familia === familiaActiva);
    }
    return ORDEN_ETAPAS.reduce((acc: any, etapa) => {
      const digisDeEtapa = Array.from(new Set(filtrados.filter((d: any) => d.Etapa === etapa).map((d: any) => d.Digimon)));
      if (digisDeEtapa.length > 0) acc[etapa] = digisDeEtapa.sort((a: any, b: any) => a.localeCompare(b));
      return acc;
    }, {});
  }, [familiaActiva, busqueda]);

  const infoDigimon = useMemo(() => {
    if (!digimonSeleccionado) return null;
    const nombreNorm = normalizarNombre(digimonSeleccionado);
    const filasDigimon = listaCompleta.filter((d: any) => normalizarNombre(d.Digimon) === nombreNorm);
    if (filasDigimon.length === 0) return null;

    const filaPrincipal = filasDigimon.find((f: any) => f.Familia === familiaActiva) || filasDigimon[0];
    const etapaActual = filaPrincipal.Etapa;
    const familiaReal = filaPrincipal.Familia;

    const preEvoluciones = listaCompleta.filter((d: any) => d.Familia === familiaReal && normalizarNombre(d["Evoluciona A"]) === nombreNorm);
    
    const evoluciones = listaCompleta
      .filter((fila: any) => fila.Familia === familiaReal && normalizarNombre(fila.Digimon) === nombreNorm)
      .filter((fila: any) => fila["Evoluciona A"] && fila["Evoluciona A"].trim() !== "")
      .map((fila: any) => {
        const req = requisitos.find((r: any) => r.RAMA === fila.Rama);
        let col = "";
        if (etapaActual === "BB1") col = "De BB1 a BB2";
        else if (etapaActual === "BB2") col = "De BB2 a CHILD";
        else if (etapaActual === "CHILD") col = "De CHILD a ADULT";
        else if (etapaActual === "ADULT") col = "De ADULT a PERFECT";
        else if (etapaActual === "PERFECT") col = "De PERFECT a ULTIMATE";
        else if (etapaActual === "ULTIMATE") col = "De ULTIMATE a SUPER ULTIMATE";
        return { rama: fila.Rama, evolucionaA: fila["Evoluciona A"], requisito: req ? (req as any)[col] : "No definido" };
      });
    return { etapa: etapaActual, familia: familiaReal, preEvoluciones, evoluciones };
  }, [digimonSeleccionado, familiaActiva]);

  const volverALista = () => { playClickSound(); setDigimonSeleccionado(null); setBusqueda(""); };

  const asignarMiDigimon = () => {
    if (digimonSeleccionado) {
      playClickSound();
      agregarLog("Asignación", `Asignó a ${digimonSeleccionado}`);
      guardarMiDigimon(digimonSeleccionado); setMiDigimon(digimonSeleccionado);
      setLogs(obtenerLogs());
      volverALista();
    }
  };

  const borrarMiDigimon = () => {
    playClickSound();
    agregarLog("Asignación", `Borró su Digimon`);
    guardarMiDigimon(null); setMiDigimon(null);
    setLogs(obtenerLogs());
    volverALista();
  };

  const limpiarHistorial = () => {
    playClickSound();
    borrarLogs(); setLogs([]);
    mostrarToast("Historial limpiado.");
  };

  const irAMiRuta = () => {
    playClickSound();
    if (!miDigimon) return mostrarToast("Por favor, asigna un Digimon primero.");
    setVistaActiva("guia"); setBusqueda(""); setDigimonSeleccionado(miDigimon);
    setMenuAbierto(false);
  };

  const getEtapaColor = (etapa: string) => {
    switch(etapa) {
      case "BB1": return "bg-pink-900/30 text-pink-400 border-pink-800";
      case "BB2": return "bg-purple-900/30 text-purple-400 border-purple-800";
      case "CHILD": return "bg-blue-900/30 text-blue-400 border-blue-800";
      case "ADULT": return "bg-teal-900/30 text-teal-400 border-teal-800";
      case "PERFECT": return "bg-orange-900/30 text-orange-400 border-orange-800";
      case "ULTIMATE": return "bg-red-900/30 text-red-400 border-red-800";
      case "SUPER ULTIMATE": return "bg-yellow-900/30 text-yellow-400 border-yellow-800";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div 
      className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black font-sans text-slate-200 flex overflow-hidden relative"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)', 
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      
      {/* TOAST CON ANIMACIÓN DE ENTRADA Y SALIDA LATERAL */}
      {mensajeToast && createPortal(
        <div 
          className={`fixed top-4 right-4 z-[9999] pointer-events-none ${
            visible ? "animate-slide-in-right" : "animate-slide-out-right"
          }`}
        >
          <div className="bg-slate-800 border border-blue-500/50 text-white px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center gap-2 max-w-[90vw] pointer-events-auto">
            <span className="text-lg flex-shrink-0">ℹ️</span>
            <p className="text-sm font-medium break-words">{mensajeToast}</p>
          </div>
        </div>,
        document.body
      )}

      {menuAbierto && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setMenuAbierto(false)}></div>
      )}

      <div className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 md:w-56 bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-md 
        border-r border-blue-500/30 flex flex-col shadow-[4px_0_20px_rgba(0,0,0,0.5)] 
        transform transition-transform duration-300 ease-in-out
        ${menuAbierto ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-3 border-b border-blue-500/20 flex justify-between items-center">
          <h1 className="text-lg font-bold text-white tracking-widest uppercase text-glow cursor-pointer" onClick={() => { volverALista(); setMenuAbierto(false); }}>DMPC <span className="text-blue-400">PRO</span></h1>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setMenuAbierto(false)}>✕</button>
        </div>
        <div className="flex-1 py-3 space-y-1 px-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => cambiarVista("guia")} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "guia" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>📖 Guía</button>
          <button onClick={() => cambiarVista("simulador")} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "simulador" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>⚔️ Simulador</button>
          <button onClick={() => cambiarVista("notas")} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "notas" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>📝 Notas</button>
          <button onClick={() => cambiarVista("historial")} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "historial" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>📅 Historial</button>
          <button onClick={() => cambiarVista("chat")} className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "chat" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>💬 Chat</button>
        </div>
        <div className="p-3 border-t border-blue-500/20">
          <Temporizador />
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        <div className="bg-slate-900/50 border-b border-slate-800 px-2 py-2 flex items-center gap-2 z-10 flex-shrink-0">
          <button className="md:hidden p-2 text-slate-300 hover:text-white" onClick={() => setMenuAbierto(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 w-full">
            <div className="relative w-full max-w-[150px] md:max-w-xs">
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => handleBusqueda(e.target.value)} className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-slate-500" />
              <span className="absolute right-2 top-1 text-slate-500 text-xs">🔍</span>
            </div>
            
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={irAMiRuta} className={`px-2 py-1 rounded text-[10px] font-bold border ${miDigimon ? "bg-blue-600/20 text-blue-400 border-blue-500/50" : "bg-slate-800/50 text-slate-600 border-slate-800"}`}>🎯 Mi Ruta</button>
              {miDigimon && <button onClick={borrarMiDigimon} className="px-2 py-1 rounded text-[10px] font-bold border bg-red-600/20 text-red-400 border-red-500/50">❌</button>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
          {vistaActiva === "guia" && (
            !digimonSeleccionado ? (
              <div className="max-w-5xl mx-auto space-y-4">
                {busqueda.trim() === "" && (
                  <div className="animate-slide-up">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 text-glow">Selecciona Familia</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
                      {familias.map((f: string) => (
                        <button key={f} onClick={() => { playClickSound(); setFamiliaActiva(f); setDigimonSeleccionado(null); }} className={`px-1 py-2 rounded text-[10px] md:text-[9px] font-bold transition-all border text-center truncate ${familiaActiva === f ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}>{f}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {Object.entries(digimonsAgrupados).map(([etapa, digimons], idx) => (
                    <div key={etapa} className="animate-slide-up" style={{ animationDelay: `${idx * 30}ms` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase border ${getEtapaColor(etapa)}`}>{etapa}</span>
                        <div className="h-px bg-gradient-to-r from-blue-500/20 to-transparent flex-1"></div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                        {(digimons as string[]).map((digi) => (
                          <button key={digi} onClick={() => { playClickSound(); setDigimonSeleccionado(digi); }} className="cyber-card bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 text-slate-300 px-2 py-2 rounded text-xs md:text-[11px] font-medium transition-all text-center truncate group relative overflow-hidden">{digi}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : infoDigimon && (
              <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
                <div className="flex justify-center"><button onClick={asignarMiDigimon} className="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white border border-yellow-500/50 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all flex items-center gap-1">⭐ ASIGNAR COMO MI DIGIMON ⭐</button></div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border ${getEtapaColor(infoDigimon.etapa)}`}>Etapa: {infoDigimon.etapa}</span>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">{infoDigimon.familia}</span>
                </div>
                
                <div>
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-800/50 pb-1">Pre-evoluciones</h3>
                  {infoDigimon.preEvoluciones.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {infoDigimon.preEvoluciones.map((pre: any, i: number) => (
                        <button key={i} onClick={() => { playClickSound(); setDigimonSeleccionado(pre.Digimon); }} className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-slate-300 px-2 py-1 rounded text-[10px] font-medium transition-all">{pre.Digimon}</button>
                      ))}
                    </div>
                  ) : (<p className="text-slate-500 italic text-[10px] bg-slate-900/30 p-2 rounded border border-slate-800/50">Etapa inicial (Baby).</p>)}
                </div>

                <div>
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-800/50 pb-1">Evoluciones Posibles</h3>
                  {infoDigimon.evoluciones.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {infoDigimon.evoluciones.map((evo: any, i: number) => {
                        const listaReq = evo.requisito === "No Tiene" ? [] : evo.requisito.split(';');
                        return (
                          <div key={i} className="cyber-card bg-slate-900/60 rounded-lg border border-slate-800/80 p-2.5 shadow-md flex flex-col hover:border-blue-500/40 transition-all">
                            <div className="flex justify-between items-start mb-1.5">
                              <button onClick={() => { playClickSound(); setDigimonSeleccionado(evo.evolucionaA); }} className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300"><span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-xs">{evo.evolucionaA}</span><span className="text-xs">→</span></button>
                              <span className="bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border border-slate-800">Rama {evo.rama}</span>
                            </div>
                            <div className="flex-1 bg-slate-950/60 rounded p-2 border border-slate-800/50">
                              {listaReq.length > 0 ? (
                                <ul className="space-y-0.5">
                                  {listaReq.map((req: string, j: number) => (req.trim() && (<li key={j} className="text-slate-400 text-[10px] flex items-start gap-1.5"><span className="text-blue-500 font-bold">•</span> <span>{req.trim()}</span></li>)))}
                                </ul>
                              ) : (<p className="text-slate-600 italic text-[10px]">Sin requisitos.</p>)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (<div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 text-center"><p className="text-slate-400 text-xs">Límite evolutivo alcanzado.</p></div>)}
                </div>
              </div>
            )
          )}

          {vistaActiva === "simulador" && <SimuladorDashboard />}
          {vistaActiva === "notas" && <NotasDashboard />}
          {vistaActiva === "chat" && <ChatDashboard />}
          {vistaActiva === "historial" && (
            <div className="max-w-3xl mx-auto space-y-3 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white text-glow">Registro</h2>
                <button onClick={limpiarHistorial} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 px-3 py-1.5 rounded text-[10px] font-bold transition-all">Limpiar</button>
              </div>
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((h: any, i: number) => (
                    <div key={i} className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="text-[10px] md:text-xs font-bold text-blue-400">{h.accion}</span>
                        <p className="text-[9px] md:text-[10px] text-slate-400">{h.detalles}</p>
                      </div>
                      <p className="text-[8px] md:text-[9px] text-slate-500">{new Date(h.fecha).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              ) : (<p className="text-center text-slate-500 text-sm">No hay actividad.</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;