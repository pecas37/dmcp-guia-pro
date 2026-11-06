import { useState, useEffect, useRef } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, push, set, query, orderByChild } from "firebase/database";
import { playClickSound } from "../utils/sonidos";
import { obtenerMiDigimon } from "../utils/almacenamiento";

export default function ChatDashboard() {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [miDigimon] = useState(obtenerMiDigimon());
  const listaRef = useRef<HTMLDivElement>(null);
  
  const [modoChat, setModoChat] = useState<"general" | "privado">("general");
  const [usuarioDestino, setUsuarioDestino] = useState("");
  const [salaPrivada, setSalaPrivada] = useState("");

  useEffect(() => {
    const nombreGuardado = localStorage.getItem("dmpc_chat_nombre");
    if (nombreGuardado) setNombreUsuario(nombreGuardado);
    else {
      const nombre = prompt("Ingresa tu nombre para el chat:");
      if (nombre) { localStorage.setItem("dmpc_chat_nombre", nombre); setNombreUsuario(nombre); }
    }
  }, []);

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
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [mensajes]);

  const iniciarChatPrivado = () => {
    if (!nombreUsuario || !usuarioDestino.trim()) return;
    const sala = [nombreUsuario, usuarioDestino.trim()].sort().join("-");
    setSalaPrivada(sala);
    setModoChat("privado");
  };

  const enviarMensaje = async () => {
    if (texto.trim() === "" || !nombreUsuario || !rutaMensajes) return;
    playClickSound();

    const nuevoMensaje = {
      autor: nombreUsuario,
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
    <div className="h-full w-full flex flex-col animate-fade-in bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      
      {/* Selector de Modo */}
      <div className="flex bg-slate-900 border-b border-slate-700">
        <button onClick={() => { playClickSound(); setModoChat("general"); setSalaPrivada(""); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${modoChat === "general" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}>🌍 General</button>
        <button onClick={() => { playClickSound(); setModoChat("privado"); }} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${modoChat === "privado" ? "text-blue-400 border-b-2 border-blue-500" : "text-slate-500 hover:text-slate-300"}`}>🔒 Privado</button>
      </div>

      <div className="p-2 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="text-[10px] text-slate-400">{modoChat === "general" ? "Sala General" : (salaPrivada ? `Sala: ${salaPrivada}` : "Chat Privado")}</div>
        <div className="text-[10px] text-blue-400 font-bold">{nombreUsuario}</div>
      </div>

      {modoChat === "privado" && !salaPrivada && (
        <div className="p-4 bg-slate-900/80 flex flex-col gap-2">
          <p className="text-xs text-slate-400">Nombre del usuario con quien hablar:</p>
          <div className="flex gap-2">
            <input type="text" value={usuarioDestino} onChange={e => setUsuarioDestino(e.target.value)} placeholder="Ej: Pedro" className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
            <button onClick={iniciarChatPrivado} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">Conectar</button>
          </div>
        </div>
      )}

      <div ref={listaRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {mensajes.length === 0 ? (
          <p className="text-center text-slate-500 text-xs mt-10">No hay mensajes aún.</p>
        ) : (
          mensajes.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.autor === nombreUsuario ? "items-end" : "items-start"}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[9px] text-slate-500 font-bold">{msg.autor}</span>
                {msg.digimon && <span className="text-[8px] bg-slate-800 text-blue-400 px-1 rounded">{msg.digimon}</span>}
              </div>
              <div className={`px-3 py-1.5 rounded-lg max-w-[85%] text-sm ${msg.autor === nombreUsuario ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>{msg.texto}</div>
            </div>
          ))
        )}
      </div>

      {/* Input con padding inferior para la barra de gestos */}
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