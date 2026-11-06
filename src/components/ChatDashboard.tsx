import { useState, useEffect, useRef } from "react";
import { db } from "../utils/firebase";
import { ref, onValue, push, set } from "firebase/database";
import { playClickSound } from "../utils/sonidos";
import { obtenerMiDigimon } from "../utils/almacenamiento";

export default function ChatDashboard() {
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [texto, setTexto] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [miDigimon] = useState(obtenerMiDigimon());
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nombreGuardado = localStorage.getItem("dmpc_chat_nombre");
    if (nombreGuardado) setNombreUsuario(nombreGuardado);
    else {
      const nombre = prompt("Ingresa tu nombre para el chat:");
      if (nombre) { localStorage.setItem("dmpc_chat_nombre", nombre); setNombreUsuario(nombre); }
    }
  }, []);

  useEffect(() => {
    const mensajesRef = ref(db, 'chat/general');
    const unsubscribe = onValue(mensajesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const lista = Object.entries(data).map(([id, valor]: any) => ({ id, ...valor }));
        lista.sort((a, b) => a.timestamp - b.timestamp);
        setMensajes(lista);
      } else setMensajes([]);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (listaRef.current) listaRef.current.scrollTop = listaRef.current.scrollHeight;
  }, [mensajes]);

  const enviarMensaje = async () => {
    if (texto.trim() === "" || !nombreUsuario) return;
    playClickSound();
    const nuevoMensaje = { autor: nombreUsuario, texto: texto.trim(), timestamp: Date.now(), digimon: miDigimon || null };
    const mensajesRef = ref(db, 'chat/general');
    const nuevoMensajeRef = push(mensajesRef);
    await set(nuevoMensajeRef, nuevoMensaje);
    setTexto("");
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col animate-fade-in">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-white text-glow">Chat de la Comunidad</h2>
        <p className="text-[10px] text-slate-400 mt-0.5">Conectado como: <span className="text-blue-400 font-bold">{nombreUsuario || "Cargando..."}</span></p>
      </div>
      <div className="flex-1 bg-slate-900/60 rounded-lg border border-slate-800 flex flex-col overflow-hidden">
        <div ref={listaRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
          {mensajes.length === 0 ? (<p className="text-center text-slate-500 text-sm mt-10">No hay mensajes aún.</p>) : (
            mensajes.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.autor === nombreUsuario ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] text-slate-500 font-bold">{msg.autor}</span>
                  {msg.digimon && <span className="text-[8px] bg-slate-800 text-blue-400 px-1 rounded">{msg.digimon}</span>}
                </div>
                <div className={`px-3 py-1.5 rounded-lg max-w-[80%] text-sm ${msg.autor === nombreUsuario ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-200"}`}>{msg.texto}</div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="flex gap-2">
            <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && enviarMensaje()} placeholder="Escribe un mensaje..." className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            <button onClick={enviarMensaje} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  );
}