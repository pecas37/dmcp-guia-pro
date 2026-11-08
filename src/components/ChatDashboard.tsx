import { useState, useEffect, useRef } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, push, set, remove, query, orderByChild, limitToLast } from "firebase/database";
import { playClickSound } from "../utils/sonidos";
import { playNotificacionSound, mostrarNotificacion } from "../utils/notificaciones";
import { 
  obtenerProgreso, 
  obtenerMiIdChat, 
  obtenerMiNombreChat, 
  guardarMiNombreChat,
  obtenerUsuariosBloqueados,
  bloquearUsuario,
  desbloquearUsuario,
  ocultarMensajesHasta,
  obtenerTimestampOculto
} from "../utils/almacenamiento";

const EMOJIS_RECIENTES_KEY = "dmpc_emojis_recientes";
const EMOJIS_DEFAULT = ["😀", "😂", "😍", "🤔", "😎", "😭", "😡", "👍", "👎", "🔥", "💯", "🎉"];

export default function ChatDashboard() {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [miId] = useState(obtenerMiIdChat());
  const [miNombre, setMiNombre] = useState(obtenerMiNombreChat());
  const [miDigimon] = useState(obtenerProgreso().digimon || null); // CAMBIO AQUÍ
  const listaRef = useRef<HTMLDivElement>(null);
  
  const [modoChat, setModoChat] = useState<"general" | "privado">("general");
  const [salaPrivada, setSalaPrivada] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  
  const [conversaciones, setConversaciones] = useState<{id: string, nombre: string}[]>(() => {
    const guardadas = localStorage.getItem("dmpc_chat_conversaciones");
    return guardadas ? JSON.parse(guardadas) : [];
  });

  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  const [mostrarNotificacionSolicitud, setMostrarNotificacionSolicitud] = useState(false);
  const [bloqueados, setBloqueados] = useState<string[]>(obtenerUsuariosBloqueados());
  
  const [emojisRecientes, setEmojisRecientes] = useState<string[]>(() => {
    const guardados = localStorage.getItem(EMOJIS_RECIENTES_KEY);
    return guardados ? JSON.parse(guardados) : EMOJIS_DEFAULT;
  });

  useEffect(() => {
    if (!miNombre) {
      const nombre = prompt("Ingresa tu nombre visible para el chat:");
      if (nombre) { guardarMiNombreChat(nombre); setMiNombre(nombre); }
    }
  }, [miNombre]);

  useEffect(() => {
    localStorage.setItem("dmpc_chat_conversaciones", JSON.stringify(conversaciones));
  }, [conversaciones]);

  useEffect(() => {
    localStorage.setItem(EMOJIS_RECIENTES_KEY, JSON.stringify(emojisRecientes));
  }, [emojisRecientes]);

  const rutaMensajes = modoChat === "general" 
    ? 'chat/general' 
    : (salaPrivada ? `chat/privado/${salaPrivada}` : null);

  useEffect(() => {
    if (!rutaMensajes) { setMensajes([]); return; }

    const mensajesRef = modoChat === "general" 
      ? query(ref(db, rutaMensajes), orderByChild('timestamp'), limitToLast(10))
      : query(ref(db, rutaMensajes), orderByChild('timestamp'));

    const unsubscribe = onValue(mensajesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let lista = Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }));
        lista.sort((a, b) => a.timestamp - b.timestamp);
        
        const ocultoHasta = obtenerTimestampOculto(rutaMensajes);
        if (ocultoHasta > 0) {
          lista = lista.filter(m => m.timestamp > ocultoHasta);
        }

        const ultimoMensaje = lista[lista.length - 1];
        if (ultimoMensaje && ultimoMensaje.autorId !== miId) {
          const isNew = !mensajes.find(m => m.id === ultimoMensaje.id);
          if (isNew) {
            playNotificacionSound();
            mostrarNotificacion("Nuevo mensaje en DMPC PRO", `${ultimoMensaje.autorNombre}: ${ultimoMensaje.texto}`);
          }
        }

        setMensajes(lista);
      } else { setMensajes([]); }
    });
    return () => unsubscribe();
  }, [rutaMensajes, modoChat, miId, mensajes]);

  useEffect(() => {
    if (!miId) return;
    const solicitudesRef = ref(db, `solicitudes/${miId}`);
    const unsubscribe = onValue(solicitudesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const primeraSolicitud = Object.values(data)[0] as any;
        if (primeraSolicitud && !bloqueados.includes(primeraSolicitud.deId)) {
          setSolicitudSeleccionada(primeraSolicitud);
          setMostrarNotificacionSolicitud(true);
          playNotificacionSound();
        }
      } else {
        setMostrarNotificacionSolicitud(false);
        setSolicitudSeleccionada(null);
      }
    });
    return () => unsubscribe();
  }, [miId, bloqueados]);

  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [mensajes]);

  const enviarSolicitud = async (autorId: string, autorNombre: string) => {
    if (autorId === miId || bloqueados.includes(autorId)) return;
    playClickSound();
    const nuevaSolicitudRef = push(ref(db, `solicitudes/${autorId}`));
    await set(nuevaSolicitudRef, { deId: miId, deNombre: miNombre, timestamp: Date.now() });
  };

  const aceptarSolicitud = async () => {
    if (!solicitudSeleccionada) return;
    playClickSound();
    const sala = [miId, solicitudSeleccionada.deId].sort().join("-");
    
    const existe = conversaciones.find(c => c.id === sala);
    if (!existe) {
      setConversaciones([...conversaciones, { id: sala, nombre: solicitudSeleccionada.deNombre }]);
    }
    
    setSalaPrivada(sala);
    setNombreContacto(solicitudSeleccionada.deNombre);
    setModoChat("privado");
    await remove(ref(db, `solicitudes/${miId}`));
    setMostrarNotificacionSolicitud(false);
    setSolicitudSeleccionada(null);
  };

  const rechazarSolicitud = async () => {
    if (!solicitudSeleccionada) return;
    playClickSound();
    await remove(ref(db, `solicitudes/${miId}`));
    setMostrarNotificacionSolicitud(false);
    setSolicitudSeleccionada(null);
  };

  const bloquearAlUsuario = async () => {
    if (!solicitudSeleccionada) return;
    playClickSound();
    bloquearUsuario(solicitudSeleccionada.deId);
    setBloqueados(obtenerUsuariosBloqueados());
    await rechazarSolicitud();
  };

  const borrarConversacion = (salaId: string) => {
    playClickSound();
    setConversaciones(conversaciones.filter(c => c.id !== salaId));
    if (salaPrivada === salaId) setSalaPrivada("");
  };

  const desbloquear = (id: string) => {
    playClickSound();
    const nuevos = desbloquearUsuario(id);
    setBloqueados(nuevos);
  };

  const vaciarChatPrivado = () => {
    if (!rutaMensajes || modoChat !== "privado") return;
    playClickSound();
    const ahora = Date.now();
    ocultarMensajesHasta(rutaMensajes, ahora);
    setMensajes([]);
  };

  const borrarMensaje = async (mensajeId: string) => {
    if (!rutaMensajes) return;
    playClickSound();
    try {
      const mensajeRef = ref(db, `${rutaMensajes}/${mensajeId}`);
      await remove(mensajeRef);
    } catch (error) {
      console.error("Error al borrar mensaje:", error);
    }
  };

  const enviarMensaje = async () => {
    if (texto.trim() === "" || !miId || !rutaMensajes) return;
    playClickSound();
    
    if (texto.length <= 2 && /\p{Emoji}/u.test(texto)) {
      const nuevosRecientes = [texto, ...emojisRecientes.filter(e => e !== texto)].slice(0, 10);
      setEmojisRecientes(nuevosRecientes);
    }

    const nuevoMensaje = { autorId: miId, autorNombre: miNombre, texto: texto.trim(), timestamp: Date.now(), digimon: miDigimon || null };
    const nuevoMensajeRef = push(ref(db, rutaMensajes));
    await set(nuevoMensajeRef, nuevoMensaje);
    setTexto("");
  };

  const agregarEmoji = (emoji: string) => {
    playClickSound();
    setTexto(prev => prev + emoji);
  };

  const volverAListaPrivados = () => {
    playClickSound();
    setSalaPrivada("");
    setNombreContacto("");
  };

  return (
    <div className="h-full w-full flex flex-col animate-fade-in bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {mostrarNotificacionSolicitud && solicitudSeleccionada && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-xl p-4 w-full max-w-xs shadow-[0_0_30px_rgba(59,130,246,0.4)]">
            <h3 className="text-sm font-bold text-white text-center mb-2">¡Nueva Solicitud!</h3>
            <p className="text-xs text-slate-300 text-center mb-4"><span className="text-blue-400 font-bold">{solicitudSeleccionada.deNombre}</span> quiere hablar contigo.</p>
            <div className="flex flex-col gap-2">
              <button onClick={aceptarSolicitud} className="w-full bg-green-600 hover:bg-green-500 text-white py-1.5 rounded text-xs font-bold">Aceptar</button>
              <button onClick={rechazarSolicitud} className="w-full bg-red-600 hover:bg-red-500 text-white py-1.5 rounded text-xs font-bold">Rechazar</button>
              <button onClick={bloquearAlUsuario} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-xs font-bold">Bloquear</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-slate-900 border-b border-slate-700">
        <button onClick={() => { playClickSound(); setModoChat("general"); setSalaPrivada(""); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${modoChat === "general" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}>🌍 General</button>
        <button onClick={() => { playClickSound(); setModoChat("privado"); setSalaPrivada(""); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${modoChat === "privado" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}>🔒 Privado</button>
      </div>

      <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {modoChat === "privado" && salaPrivada && (
            <button onClick={volverAListaPrivados} className="text-blue-400 hover:text-white font-bold text-lg leading-none">←</button>
          )}
          <div className="text-[10px] text-slate-400">
            {modoChat === "general" ? "Sala General (últimos 10)" : (salaPrivada ? nombreContacto : "Chats Privados")}
          </div>
        </div>
        <div className="text-[10px] text-blue-400 font-bold">{miNombre}</div>
      </div>

      {modoChat === "privado" && !salaPrivada && (
        <div className="p-2 bg-slate-900/80 flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-60">
          <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">Tus Conversaciones</p>
          {conversaciones.length === 0 ? (
            <p className="text-[10px] text-slate-500 text-center py-2">No tienes conversaciones privadas.</p>
          ) : (
            conversaciones.map((conv) => (
              <div key={conv.id} className="flex items-center gap-1">
                <button onClick={() => { playClickSound(); setSalaPrivada(conv.id); setNombreContacto(conv.nombre); }} className="flex-1 text-left bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1.5 rounded text-[10px] font-medium transition-colors truncate">
                  💬 Chat con: {conv.nombre}
                </button>
                <button onClick={() => borrarConversacion(conv.id)} className="bg-red-900/50 hover:bg-red-800 text-red-300 px-2 py-1.5 rounded text-[10px] font-bold" title="Cerrar chat">X</button>
              </div>
            ))
          )}

          {bloqueados.length > 0 && (
            <>
              <p className="text-[9px] text-slate-500 uppercase font-bold mt-2 border-t border-slate-800 pt-1">Usuarios Bloqueados</p>
              {bloqueados.map((id) => (
                <div key={id} className="flex items-center justify-between bg-slate-900/50 px-2 py-1 rounded">
                  <span className="text-[10px] text-slate-400">{id.substring(0, 8)}...</span>
                  <button onClick={() => desbloquear(id)} className="text-[9px] bg-green-900/50 hover:bg-green-800 text-green-300 px-2 py-0.5 rounded font-bold">Desbloquear</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {modoChat === "privado" && salaPrivada && (
        <div className="p-1 bg-slate-900/30 flex justify-end">
          <button onClick={vaciarChatPrivado} className="text-[9px] bg-red-900/30 hover:bg-red-800 text-red-300 px-2 py-1 rounded font-bold">Vaciar Chat</button>
        </div>
      )}

      <div ref={listaRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {mensajes.length === 0 ? (
          <p className="text-center text-slate-500 text-xs mt-10">No hay mensajes aún.</p>
        ) : (
          mensajes.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.autorId === miId ? "items-end" : "items-start"} group`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span onClick={() => msg.autorId !== miId && modoChat === "general" && enviarSolicitud(msg.autorId, msg.autorNombre)} className={`text-[9px] font-bold ${msg.autorId !== miId && modoChat === "general" ? "text-blue-400 hover:text-blue-300 cursor-pointer underline decoration-dotted" : "text-slate-500"}`}>{msg.autorNombre}</span>
                {msg.digimon && <span className="text-[8px] bg-slate-800 text-blue-400 px-1 rounded">{msg.digimon}</span>}
                
                {msg.autorId === miId && (
                  <button onClick={() => borrarMensaje(msg.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" title="Borrar mensaje">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
              <div className={`px-3 py-1.5 rounded-lg max-w-[85%] text-sm ${msg.autorId === miId ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>{msg.texto}</div>
            </div>
          ))
        )}
      </div>

      {modoChat === "general" || salaPrivada ? (
        <div className="px-2 pt-1 flex gap-1 overflow-x-auto custom-scrollbar pb-1" style={{ maxWidth: '100%' }}>
          {emojisRecientes.map((emoji, i) => (
            <button key={i} onClick={() => agregarEmoji(emoji)} className="text-lg hover:scale-125 transition-transform px-1">
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="p-2 border-t border-slate-800 bg-slate-950/80 flex gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()} placeholder={modoChat === "privado" && !salaPrivada ? "Elige un chat..." : "Escribe un mensaje..."} disabled={modoChat === "privado" && !salaPrivada} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50" />
        <button onClick={enviarMensaje} disabled={modoChat === "privado" && !salaPrivada} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Enviar</button>
      </div>
    </div>
  );
}