// --- DIGIMON ASIGNADO Y PROGRESO ---
export const obtenerProgreso = () => {
  const progreso = localStorage.getItem("dmpc_progreso");
  return progreso ? JSON.parse(progreso) : {
    digimon: "",
    familia: "",
    etapa: "",
    entrenamientos: 0,
    batallas: 0,
    victorias: 0,
    errores: 0,
    atk: 0,
    def: 0,
    dex: 0,
    peso: 0,
    edad: 0,
    luz: "Encendida",
    animo: "Alegre"
  };
};

export const guardarProgreso = (progreso: any) => {
  localStorage.setItem("dmpc_progreso", JSON.stringify(progreso));
};

// Compatibilidad con el código antiguo
export const obtenerMiDigimon = () => obtenerProgreso().digimon || null;
export const guardarMiDigimon = (nombre: string | null) => {
  const p = obtenerProgreso();
  p.digimon = nombre || "";
  guardarProgreso(p);
};

// --- HISTORIAL / LOGS ---
export const obtenerLogs = () => {
  const logs = localStorage.getItem("dmpc_logs");
  return logs ? JSON.parse(logs) : [];
};
export const agregarLog = (accion: string, detalles: string = "") => {
  const logs = obtenerLogs();
  const nuevoLog = { fecha: new Date().toISOString(), accion, detalles };
  localStorage.setItem("dmpc_logs", JSON.stringify([nuevoLog, ...logs]));
};
export const borrarLogs = () => { localStorage.removeItem("dmpc_logs"); };

// --- NOTAS ---
export const obtenerNotas = (nombre: string) => {
  const notas = localStorage.getItem(`dmpc_notas_${nombre}`);
  if (!notas) return [];
  try { return JSON.parse(notas); } catch { return []; }
};
export const guardarNotas = (nombre: string, notas: any[]) => {
  localStorage.setItem(`dmpc_notas_${nombre}`, JSON.stringify(notas));
};

// --- SISTEMA DE CHAT ---
export const obtenerMiIdChat = () => {
  let id = localStorage.getItem("dmpc_chat_id");
  if (!id) {
    id = "user_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("dmpc_chat_id", id);
  }
  return id;
};
export const obtenerMiNombreChat = () => localStorage.getItem("dmpc_chat_nombre") || "";
export const guardarMiNombreChat = (nombre: string) => localStorage.setItem("dmpc_chat_nombre", nombre);

export const obtenerUsuariosBloqueados = () => {
  const bloqueados = localStorage.getItem("dmpc_chat_bloqueados");
  return bloqueados ? JSON.parse(bloqueados) : [];
};
export const bloquearUsuario = (id: string) => {
  const bloqueados = obtenerUsuariosBloqueados();
  if (!bloqueados.includes(id)) localStorage.setItem("dmpc_chat_bloqueados", JSON.stringify([...bloqueados, id]));
};
export const desbloquearUsuario = (id: string) => {
  const bloqueados = obtenerUsuariosBloqueados();
  const nuevos = bloqueados.filter((b: string) => b !== id);
  localStorage.setItem("dmpc_chat_bloqueados", JSON.stringify(nuevos));
  return nuevos;
};

export const ocultarMensajesHasta = (sala: string, timestamp: number) => {
  const ocultos = JSON.parse(localStorage.getItem("dmpc_msgs_ocultos") || "{}");
  ocultos[sala] = timestamp;
  localStorage.setItem("dmpc_msgs_ocultos", JSON.stringify(ocultos));
};
export const obtenerTimestampOculto = (sala: string) => {
  const ocultos = JSON.parse(localStorage.getItem("dmpc_msgs_ocultos") || "{}");
  return ocultos[sala] || 0;
};