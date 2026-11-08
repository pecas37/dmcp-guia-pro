import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { db } from "./utils/firebase";
import {
  ref,
  query,
  orderByChild,
  limitToLast,
  onValue,
} from "firebase/database";
import { playClickSound } from "./utils/sonidos";
import {
  playNotificacionSound,
  mostrarNotificacion,
} from "./utils/notificaciones";
import {
  obtenerProgreso,
  guardarProgreso,
  obtenerLogs,
  agregarLog,
  borrarLogs,
  obtenerMiIdChat,
} from "./utils/almacenamiento";
import {
  FAMILIAS_SEGURAS,
  ETAPAS_SEGURAS,
  DIGIMONS_SEGUROS,
  obtenerFichasDeDigimon,
  obtenerPreEvoluciones,
  FichaDigimon,
} from "./utils/motorDatos";
import NotasDashboard from "./components/NotasDashboard";
import ChatDashboard from "./components/ChatDashboard";
import MiProgreso from "./components/MiProgreso";
import SplashScreen from "./components/SplashScreen";

type Vista =
  | "guia"
  | "miProgreso"
  | "notas"
  | "historial"
  | "chat"
  | "creditos";

function App() {
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<Vista>("guia");
  const [familiaActiva, setFamiliaActiva] = useState(
    FAMILIAS_SEGURAS[0] || "DEEP SAVERS",
  );
  const [digimonSeleccionado, setDigimonSeleccionado] = useState<string | null>(
    null,
  );
  const [busqueda, setBusqueda] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [progreso, setProgreso] = useState(obtenerProgreso());
  const [logs, setLogs] = useState<any[]>([]);
  const [mensajeToast, setMensajeToast] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // --- LÓGICA GLOBAL DE NOTIFICACIONES ---
  const miIdGlobal = obtenerMiIdChat();

  useEffect(() => {
    const solicitudesRef = ref(db, `solicitudes/${miIdGlobal}`);
    const unsubscribeSolicitudes = onValue(solicitudesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const primera = Object.values(data)[0] as any;
        if (primera) {
          playNotificacionSound();
          mostrarNotificacion(
            "Nueva Solicitud",
            `${primera.deNombre} quiere hablar contigo.`,
          );
          mostrarToastGlobal(`🔔 ¡${primera.deNombre} quiere hablar contigo!`);
        }
      }
    });

    const misEnviosRef = ref(db, `solicitudes_enviadas/${miIdGlobal}`);
    const unsubscribeAceptadas = onValue(misEnviosRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const aceptada = Object.values(data)[0] as any;
        if (aceptada) {
          playNotificacionSound();
          mostrarNotificacion(
            "Solicitud Aceptada",
            `${aceptada.paraNombre} aceptó tu solicitud.`,
          );
          mostrarToastGlobal(`✅ ${aceptada.paraNombre} aceptó tu solicitud.`);
        }
      }
    });

    const conversacionesGuardadas = JSON.parse(
      localStorage.getItem("dmpc_chat_conversaciones") || "[]",
    );
    const unsubscribesMensajes: (() => void)[] = [];

    conversacionesGuardadas.forEach((conv: any) => {
      const q = query(
        ref(db, `chat/privado/${conv.id}`),
        orderByChild("timestamp"),
        limitToLast(1),
      );
      let primerCarga = true;

      const unsubscribe = onValue(q, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const lista = Object.values(data) as any[];
          const ultimo = lista[0];

          if (ultimo && ultimo.autorId !== miIdGlobal) {
            if (!primerCarga) {
              playNotificacionSound();
              mostrarNotificacion(
                `Mensaje de ${ultimo.autorNombre}`,
                ultimo.texto,
              );
              mostrarToastGlobal(`💬 ${ultimo.autorNombre}: ${ultimo.texto}`);
            }
          }
        }
        primerCarga = false;
      });
      unsubscribesMensajes.push(unsubscribe);
    });

    return () => {
      unsubscribeSolicitudes();
      unsubscribeAceptadas();
      unsubscribesMensajes.forEach((unsub) => unsub());
    };
  }, [miIdGlobal]);

  useEffect(() => {
    const handleToast = (e: any) => mostrarToastGlobal(e.detail);
    window.addEventListener("dmpc-toast", handleToast);
    return () => window.removeEventListener("dmpc-toast", handleToast);
  }, []);

  useEffect(() => {
    setProgreso(obtenerProgreso());
    setLogs(obtenerLogs());
  }, []);

  useEffect(() => {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.event) {
        const unlisten = tauri.event.listen("tauri://back", () => {
          if (menuAbierto) setMenuAbierto(false);
          else if (digimonSeleccionado) setDigimonSeleccionado(null);
          else if (vistaActiva !== "guia") setVistaActiva("guia");
          else tauri.app.exit();
        });
        return () => {
          unlisten.then((f: any) => f());
        };
      }
    } catch (e) {
      console.log("Botón atrás no disponible.");
    }
  }, [menuAbierto, digimonSeleccionado, vistaActiva]);

  const mostrarToastGlobal = (mensaje: string) => {
    setMensajeToast(mensaje);
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
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
  };

  const digimonsFiltrados = useMemo(() => {
    if (busqueda.trim() === "") {
      return DIGIMONS_SEGUROS[familiaActiva] || {};
    }

    const term = busqueda.trim().toLowerCase();
    const resultado: Record<string, string[]> = {};

    FAMILIAS_SEGURAS.forEach((familia) => {
      const etapas = DIGIMONS_SEGUROS[familia];
      if (!etapas) return;

      Object.entries(etapas).forEach(([etapa, digimons]) => {
        const filtrados = digimons.filter((d: string) =>
          d.toLowerCase().includes(term),
        );
        if (filtrados.length > 0) {
          if (!resultado[etapa]) resultado[etapa] = [];
          resultado[etapa] = [...resultado[etapa], ...filtrados];
        }
      });
    });

    Object.keys(resultado).forEach((etapa) => {
      resultado[etapa] = Array.from(new Set(resultado[etapa])).sort();
    });

    return resultado;
  }, [familiaActiva, busqueda]);

  const infoDigimon = useMemo(() => {
    if (!digimonSeleccionado) return null;

    const fichas = obtenerFichasDeDigimon(familiaActiva, digimonSeleccionado);
    if (fichas.length === 0) return null;

    const etapa = fichas[0].etapa;
    const preEvoluciones = obtenerPreEvoluciones(
      familiaActiva,
      digimonSeleccionado,
    );
    const evoluciones = fichas.filter((f) => f.evolucionaA !== "");

    return { etapa, preEvoluciones, evoluciones };
  }, [digimonSeleccionado, familiaActiva]);

  const volverALista = () => {
    playClickSound();
    setDigimonSeleccionado(null);
    setBusqueda("");
  };

  const asignarMiDigimon = () => {
    if (digimonSeleccionado && infoDigimon) {
      playClickSound();
      agregarLog("Asignación", `Asignó a ${digimonSeleccionado}`);
      const nuevoProgreso = {
        ...progreso,
        digimon: digimonSeleccionado,
        familia: familiaActiva,
        etapa: infoDigimon.etapa,
      };
      guardarProgreso(nuevoProgreso);
      setProgreso(nuevoProgreso);
      setLogs(obtenerLogs());
      volverALista();
    }
  };

  const borrarMiDigimon = () => {
    playClickSound();
    agregarLog("Asignación", `Borró su Digimon`);
    const nuevoProgreso = { ...progreso, digimon: "", familia: "", etapa: "" };
    guardarProgreso(nuevoProgreso);
    setProgreso(nuevoProgreso);
    setLogs(obtenerLogs());
    volverALista();
  };

  const limpiarHistorial = () => {
    playClickSound();
    borrarLogs();
    setLogs([]);
    mostrarToastGlobal("Historial limpiado.");
  };

  const irAMiRuta = () => {
    playClickSound();
    if (!progreso.digimon)
      return mostrarToastGlobal("Por favor, asigna un Digimon primero.");
    setVistaActiva("guia");
    setBusqueda("");
    setDigimonSeleccionado(progreso.digimon);
    setMenuAbierto(false);
  };

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case "BB1":
        return "bg-pink-900/30 text-pink-400 border-pink-800";
      case "BB2":
        return "bg-purple-900/30 text-purple-400 border-purple-800";
      case "CHILD":
        return "bg-blue-900/30 text-blue-400 border-blue-800";
      case "ADULT":
        return "bg-teal-900/30 text-teal-400 border-teal-800";
      case "PERFECT":
        return "bg-orange-900/30 text-orange-400 border-orange-800";
      case "ULTIMATE":
        return "bg-red-900/30 text-red-400 border-red-800";
      case "SUPER ULTIMATE":
        return "bg-yellow-900/30 text-yellow-400 border-yellow-800";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  // PANTALLA DE SPLASH
  if (mostrarSplash) {
    return <SplashScreen onFinish={() => setMostrarSplash(false)} />;
  }

  return (
    <div
      className="h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black font-sans text-slate-200 flex overflow-hidden relative"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {mensajeToast &&
        createPortal(
          <div
            className={`fixed top-4 right-4 z-[9999] pointer-events-none ${visible ? "animate-slide-in-right" : "animate-slide-out-right"}`}
          >
            <div className="bg-slate-800 border border-blue-500/50 text-white px-4 py-2 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center gap-2 max-w-[90vw] pointer-events-auto">
              <span className="text-lg shrink-0">ℹ️</span>
              <p className="text-sm font-medium break-words">{mensajeToast}</p>
            </div>
          </div>,
          document.body,
        )}

      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setMenuAbierto(false)}
        ></div>
      )}

      <div
        className={`
        fixed md:static inset-y-0 left-0 z-40
        w-64 md:w-56 bg-slate-900/95 md:bg-slate-900/80 backdrop-blur-md 
        border-r border-blue-500/30 flex flex-col shadow-[4px_0_20px_rgba(0,0,0,0.5)] 
        transform transition-transform duration-300 ease-in-out
        ${menuAbierto ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        <div className="p-3 border-b border-blue-500/20 flex justify-between items-center">
          <h1
            className="text-sm font-bold text-white tracking-widest uppercase text-glow cursor-pointer"
            onClick={() => {
              volverALista();
              setMenuAbierto(false);
            }}
          >
            DMPC GUIA <span className="text-blue-400">PRO</span>
          </h1>
          <button
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setMenuAbierto(false)}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 py-3 space-y-1 px-2 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => cambiarVista("guia")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "guia" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
          >
            📖 Guía
          </button>
          <button
            onClick={() => cambiarVista("miProgreso")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "miProgreso" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
          >
            📊 Mi Progreso
          </button>
          <button
            onClick={() => cambiarVista("notas")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "notas" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
          >
            📝 Notas
          </button>
          <button
            onClick={() => cambiarVista("historial")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "historial" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
          >
            📅 Historial
          </button>
          <button
            onClick={() => cambiarVista("chat")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "chat" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => cambiarVista("creditos")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-bold transition-all ${vistaActiva === "creditos" ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
          >
            👨‍💻 Créditos
          </button>
        </div>
        <div className="p-3 border-t border-blue-500/20 text-center">
          <p className="text-[10px] text-slate-500">DMPC GUIA PRO v1.0</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        <div className="bg-slate-900/50 border-b border-slate-800 px-2 py-2 flex items-center gap-2 z-10 flex-shrink-0">
          <button
            className="md:hidden p-2 text-slate-300 hover:text-white"
            onClick={() => setMenuAbierto(true)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex items-center gap-2 w-full">
            <div className="relative w-full max-w-[150px] md:max-w-xs">
              <input
                type="text"
                placeholder="Buscar..."
                value={busqueda}
                onChange={(e) => handleBusqueda(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 placeholder-slate-500"
              />
              <span className="absolute right-2 top-1 text-slate-500 text-xs">
                🔍
              </span>
            </div>

            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={irAMiRuta}
                className={`px-2 py-1 rounded text-[10px] font-bold border ${progreso.digimon ? "bg-blue-600/20 text-blue-400 border-blue-500/50" : "bg-slate-800/50 text-slate-600 border-slate-800"}`}
              >
                🎯 Mi Ruta
              </button>
              {progreso.digimon && (
                <button
                  onClick={borrarMiDigimon}
                  className="px-2 py-1 rounded text-[10px] font-bold border bg-red-600/20 text-red-400 border-red-500/50"
                >
                  ❌
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
          <div style={{ display: vistaActiva === "guia" ? "block" : "none" }}>
            {!digimonSeleccionado ? (
              <div className="max-w-5xl mx-auto space-y-4">
                {busqueda.trim() === "" && (
                  <div className="animate-slide-up">
                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 text-glow">
                      Selecciona Familia
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
                      {FAMILIAS_SEGURAS.map((f: string) => (
                        <button
                          key={f}
                          onClick={() => {
                            playClickSound();
                            setFamiliaActiva(f);
                            setDigimonSeleccionado(null);
                          }}
                          className={`px-1 py-2 rounded text-[10px] md:text-[9px] font-bold transition-all border text-center truncate ${familiaActiva === f ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]" : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {ETAPAS_SEGURAS.map((etapa) => {
                    const digimons = digimonsFiltrados[etapa] || [];
                    if (digimons.length === 0) return null;

                    return (
                      <div key={etapa} className="animate-slide-up">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase border ${getEtapaColor(etapa)}`}
                          >
                            {etapa}
                          </span>
                          <div className="h-px bg-gradient-to-r from-blue-500/20 to-transparent flex-1"></div>
                          <span className="text-[8px] text-slate-600 font-medium">
                            {digimons.length} Digimon(s)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                          {digimons.map((digi: string) => (
                            <button
                              key={digi}
                              onClick={() => {
                                playClickSound();
                                setDigimonSeleccionado(digi);
                              }}
                              className="cyber-card bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/80 text-slate-300 px-2 py-2 rounded text-xs md:text-[11px] font-medium transition-all text-center truncate group relative overflow-hidden"
                            >
                              {digi}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              infoDigimon && (
                <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
                  <div className="flex justify-start mb-2">
                    <button
                      onClick={volverALista}
                      className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2"
                    >
                      <span>←</span> Volver a la lista
                    </button>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={asignarMiDigimon}
                      className="bg-yellow-600/20 hover:bg-yellow-600 text-yellow-400 hover:text-white border border-yellow-500/50 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all flex items-center gap-1"
                    >
                      ⭐ ASIGNAR COMO MI DIGIMON ⭐
                    </button>
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase border ${getEtapaColor(infoDigimon.etapa)}`}
                    >
                      Etapa: {infoDigimon.etapa}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">
                      {familiaActiva}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-800/50 pb-1">
                      Pre-evoluciones
                    </h3>
                    {infoDigimon.preEvoluciones.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {infoDigimon.preEvoluciones.map(
                          (pre: any, i: number) => (
                            <button
                              key={i}
                              onClick={() => {
                                playClickSound();
                                setDigimonSeleccionado(pre.nombre);
                              }}
                              className="bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-slate-300 px-2 py-1 rounded text-[10px] font-medium transition-all"
                            >
                              {pre.nombre} (Rama {pre.rama})
                            </button>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic text-[10px] bg-slate-900/30 p-2 rounded border border-slate-800/50">
                        Etapa inicial (Baby).
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 border-b border-slate-800/50 pb-1">
                      Evoluciones Posibles
                    </h3>
                    {infoDigimon.evoluciones.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {infoDigimon.evoluciones.map(
                          (evo: FichaDigimon, i: number) => {
                            const listaReq =
                              evo.requisito === "No Tiene" ||
                              evo.requisito === "No definido"
                                ? []
                                : evo.requisito.split(";");
                            return (
                              <div
                                key={i}
                                className="cyber-card bg-slate-900/60 rounded-lg border border-slate-800/80 p-2.5 shadow-md flex flex-col hover:border-blue-500/40 transition-all"
                              >
                                <div className="flex justify-between items-start mb-1.5">
                                  <button
                                    onClick={() => {
                                      playClickSound();
                                      setDigimonSeleccionado(evo.evolucionaA);
                                    }}
                                    className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300"
                                  >
                                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-xs">
                                      {evo.evolucionaA}
                                    </span>
                                    <span className="text-xs">→</span>
                                  </button>
                                  <span className="bg-slate-950 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border border-slate-800">
                                    Rama {evo.rama}
                                  </span>
                                </div>
                                <div className="flex-1 bg-slate-950/60 rounded p-2 border border-slate-800/50">
                                  {listaReq.length > 0 ? (
                                    <ul className="space-y-0.5">
                                      {listaReq.map(
                                        (req: string, j: number) =>
                                          req.trim() && (
                                            <li
                                              key={j}
                                              className="text-slate-400 text-[10px] flex items-start gap-1.5"
                                            >
                                              <span className="text-blue-500 font-bold">
                                                •
                                              </span>{" "}
                                              <span>{req.trim()}</span>
                                            </li>
                                          ),
                                      )}
                                    </ul>
                                  ) : (
                                    <p className="text-slate-600 italic text-[10px]">
                                      Sin requisitos.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-4 text-center">
                        <p className="text-slate-400 text-xs">
                          Límite evolutivo alcanzado.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <div
            style={{ display: vistaActiva === "miProgreso" ? "block" : "none" }}
          >
            <MiProgreso />
          </div>

          <div style={{ display: vistaActiva === "notas" ? "block" : "none" }}>
            <NotasDashboard />
          </div>

          <div
            style={{ display: vistaActiva === "historial" ? "block" : "none" }}
          >
            <div className="max-w-3xl mx-auto space-y-3 animate-fade-in">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white text-glow">
                  Registro
                </h2>
                <button
                  onClick={limpiarHistorial}
                  className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/50 px-3 py-1.5 rounded text-[10px] font-bold transition-all"
                >
                  Limpiar
                </button>
              </div>
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((h: any, i: number) => (
                    <div
                      key={i}
                      className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <span className="text-[10px] md:text-xs font-bold text-blue-400">
                          {h.accion}
                        </span>
                        <p className="text-[9px] md:text-[10px] text-slate-400">
                          {h.detalles}
                        </p>
                      </div>
                      <p className="text-[8px] md:text-[9px] text-slate-500">
                        {new Date(h.fecha).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 text-sm">
                  No hay actividad.
                </p>
              )}
            </div>
          </div>

          {/* VISTA CHAT */}
          <div
            style={{
              display: vistaActiva === "chat" ? "block" : "none",
              height: "100%",
            }}
          >
            <ChatDashboard />
          </div>

          {/* NUEVA VISTA CRÉDITOS */}
          {/* NUEVA VISTA CRÉDITOS */}
          <div
            style={{ display: vistaActiva === "creditos" ? "block" : "none" }}
          >
            <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center mt-10 pb-10">
              <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col items-center">
                {/* Barra superior decorativa */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500"></div>

                <h2 className="text-3xl font-black text-white tracking-widest uppercase text-glow mb-1">
                  DMPC GUIA <span className="text-blue-400">PRO</span>
                </h2>
                <p className="text-slate-400 text-sm mb-6">
                  Tu compañero definitivo para el DMPC 3.1.3-3
                </p>

                {/* Logo y Nombre */}
                <div className="flex flex-col items-center gap-3 mb-8">
                  <img
                    src="/logo.png"
                    alt="Logo Desertor H"
                    className="w-32 h-32 object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                  />
                  <div className="text-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">
                      Desarrollado por
                    </span>
                    <span className="text-xl font-bold text-white tracking-wide">
                      Desertor H
                    </span>
                  </div>
                </div>

                {/* Enlaces */}
                <div className="w-full space-y-5 text-sm text-slate-300">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      Comunidad (Soporte y Ayuda)
                    </span>
                    <a
                      href="https://discord.gg/Jr2BVJ4Hgc" // <-- CAMBIA ESTO POR EL LINK DE TU SERVIDOR
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-4 font-medium flex items-center gap-2"
                    >
                      Servidor de Discord DMPC GUIA PRO
                    </a>
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      Contacto Directo
                    </span>
                    <a
                      href="https://discord.com/users/desertorh" // <-- CAMBIA ESTO POR TU ID DE DISCORD (O tu enlace de perfil)
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 font-medium flex items-center gap-2"
                    >
                      Perfil de Discord: Desertor H
                    </a>
                  </div>
                </div>

                {/* Copyright */}
                <div className="mt-8 pt-6 border-t border-slate-800/50 w-full">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Todos los derechos reservados. Este es un proyecto de código
                    abierto creado por fans.
                    <br />
                    Digimon y todas las imágenes asociadas son marcas
                    registradas de Bandai / Toei Animation.
                    <br />
                    Esta aplicación no tiene fines de lucro y no está afiliada a
                    Bandai.
                  </p>
                  <p className="text-[10px] text-slate-600 font-bold mt-3">
                    © {new Date().getFullYear()} DMPC GUIA PRO - Desertor H
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
