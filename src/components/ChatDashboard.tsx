import { useState, useEffect, useRef } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, push, set, remove, query, orderByChild } from "firebase/database";
import { playClickSound } from "../utils/sonidos";
import { 
  obtenerMiDigimon, 
  obtenerMiIdChat, 
  obtenerMiNombreChat, 
  guardarMiNombreChat,
  obtenerUsuariosBloqueados,
  bloquearUsuario
} from "../utils/almacenamiento";
import { registrarNotificaciones } from "../utils/notificaciones"; // IMPORTAMOS LA FUNCIÓN

export default function ChatDashboard() {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [miId] = useState(obtenerMiIdChat());
  const [miNombre, setMiNombre] = useState(obtenerMiNombreChat());
  const [miDigimon] = useState(obtenerMiDigimon());
  const listaRef = useRef<HTMLDivElement>(null);
  
  const [modoChat, setModoChat] = useState<"general" | "privado">("general");
  const [salaPrivada, setSalaPrivada] = useState("");
  
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any>(null);
  const [mostrarNotificacion, setMostrarNotificacion] = useState(false);
  const [bloqueados, setBloqueados] = useState<string[]>(obtenerUsuariosBloqueados());

  // Pedir nombre y registrar notificaciones
  useEffect(() => {
    if (!miNombre) {
      const nombre = prompt("Ingresa tu nombre visible para el chat:");
      if (nombre) {
        guardarMiNombreChat(nombre);
        setMiNombre(nombre);
      }
    }
    
    // Llamamos a la función de notificaciones
    if (miId) {
      registrarNotificaciones(miId);
    }
  }, [miNombre, miId]);

  const rutaMensajes = modoChat === "general" 
    ? 'chat/general' 
    : (salaPrivada ? `chat/privado/${salaPrivada}` : null);

  useEffect(() => {
    if (!rutaMensajes) {
      setMensajes([]);
      return;
    }

    const mensajesRef = query(ref(db, rutaMensajes), orderByChild('timestamp'));
    const unsubscribe = onValue(mensajesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }));
        lista.sort((a, b) => a.timestamp - b.timestamp);
        setMensajes(lista);
      } else {
        setMensajes([]);
      }
    });
    return () => unsubscribe();
  }, [rutaMensajes]);

  useEffect(() => {
    if (!miId) return;
    const solicitudesRef = ref(db, `solicitudes/${miId}`);
    
    const unsubscribe = onValue(solicitudesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const primeraSolicitud = Object.values(data)[0] as any;
        if (primeraSolicitud && !bloqueados.includes(primeraSolicitud.deId)) {
          setSolicitudSeleccionada(primeraSolicitud);
          setMostrarNotificacion(true);
        }
      } else {
        setMostrarNotificacion(false);
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
    await set(nuevaSolicitudRef, {
      deId: miId,
      deNombre: miNombre,
      timestamp: Date.now()
    });
    
    alert(`Solicitud enviada a ${autorNombre}. Espera su respuesta.`);
    setSolicitudSeleccionada(null);
  };

  const aceptarSolicitud = async () => {
    if (!solicitudSeleccionada) return;
    playClickSound();
    
    const sala = [miId, solicitudSeleccionada.deId].sort().join("-");
    setSalaPrivada(sala);
    setModoChat("privado");
    
    const solicitudesRef = ref(db, `solicitudes/${miId}`);
    await remove(solicitudesRef);
    
    setMostrarNotificacion(false);
    setSolicitudSeleccionada(null);
  };

  const rechazarSolicitud = async () => {
    if (!solicitudSeleccionada) return;
    playClickSound();
    const solicitudesRef = ref(db, `solicitudes/${miId}`);
    await remove(solicitudesRef);
    setMostrarNotificacion(false);
    setSolicitudSeleccionada(null);
  };

  const bloquearAlUsuario = async () => {
    if (!solicitudSeleccionada) return;
    playClickSound();
    bloquearUsuario(solicitudSeleccionada.deId);
    setBloqueados(obtenerUsuariosBloqueados());
    await rechazarSolicitud();
    alert("Usuario bloqueado. No volverá a molestarte.");
  };

  const enviarMensaje = async () => {
    if (texto.trim() === "" || !miId || !rutaMensajes) return;
    playClickSound();

    const nuevoMensaje = {
      autorId: miId,
      autorNombre: miNombre,
      texto: texto.trim(),
      timestamp: Date.now(),
      digimon: miDigimon || null
    };

    const mensajesRef = ref(db, rutaMensajes);
    const nuevoMensajeRef = push(mensajesRef);
    await set(nuevoMensajeRef, nuevoMensaje);
    setTexto("");
  };

  return (
    <div className="h-full w-full flex flex-col animate-fade-in bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      
      {mostrarNotificacion && solicitudSeleccionada && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/50 rounded-xl p-4 w-full max-w-xs shadow-[0_0_30px_rgba(59,130,246,0.4)]">
            <h3 className="text-sm font-bold text-white text-center mb-2">¡Nueva Solicitud!</h3>
            <p className="text-xs text-slate-300 text-center mb-4">
              <span className="text-blue-400 font-bold">{solicitudSeleccionada.deNombre}</span> quiere hablar contigo en privado.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={aceptarSolicitud} className="w-full bg-green-600 hover:bg-green-500 text-white py-1.5 rounded text-xs font-bold">Aceptar</button>
              <button onClick={rechazarSolicitud} className="w-full bg-red-600 hover:bg-red-500 text-white py-1.5 rounded text-xs font-bold">Rechazar</button>
              <button onClick={bloquearAlUsuario} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-xs font-bold">Bloquear Usuario</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex bg-slate-900 border-b border-slate-700">
        <button onClick={() => { playClickSound(); setModoChat("general"); setSalaPrivada(""); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${modoChat === "general" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}>🌍 General</button>
        <button onClick={() => { playClickSound(); setModoChat("privado"); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${modoChat === "privado" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}>🔒 Privado</button>
      </div>

      <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="text-[10px] text-slate-400">{modoChat === "general" ? "Sala General" : (salaPrivada ? `Sala Privada` : "Chat Privado")}</div>
        <div className="text-[10px] text-blue-400 font-bold">{miNombre} <span className="text-slate-500 text-[8px]">({miId})</span></div>
      </div>

      {modoChat === "privado" && !salaPrivada && (
        <div className="p-4 bg-slate-900/80 flex flex-col gap-2">
          <p className="text-xs text-slate-400">Haz clic en el nombre de un usuario en el chat general para enviarle una solicitud.</p>
        </div>
      )}

      <div ref={listaRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {mensajes.length === 0 ? (
          <p className="text-center text-slate-500 text-xs mt-10">No hay mensajes aún.</p>
        ) : (
          mensajes.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.autorId === miId ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span 
                  onClick={() => msg.autorId !== miId && enviarSolicitud(msg.autorId, msg.autorNombre)}
                  className={`text-[9px] font-bold ${msg.autorId !== miId ? "text-blue-400 hover:text-blue-300 cursor-pointer underline decoration-dotted" : "text-slate-500"}`}
                >
                  {msg.autorNombre}
                </span>
                {msg.digimon && <span className="text-[8px] bg-slate-800 text-blue-400 px-1 rounded">{msg.digimon}</span>}
              </div>
              <div className={`px-3 py-1.5 rounded-lg max-w-[85%] text-sm ${msg.autorId === miId ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>{msg.texto}</div>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-slate-800 bg-slate-950/80 flex gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()}
          placeholder={modoChat === "privado" && !salaPrivada ? "Conecta primero..." : "Escribe un mensaje..."}
          disabled={modoChat === "privado" && !salaPrivada}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button onClick={enviarMensaje} disabled={modoChat === "privado" && !salaPrivada} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">Enviar</button>
      </div>
    </div>
  );
}