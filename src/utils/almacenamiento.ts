export const obtenerMiDigimon = () => localStorage.getItem("dmpc_mi_digimon") || null;
export const guardarMiDigimon = (nombre: string | null) => {
  if (nombre) localStorage.setItem("dmpc_mi_digimon", nombre);
  else localStorage.removeItem("dmpc_mi_digimon");
};

export const obtenerLogs = () => {
  const logs = localStorage.getItem("dmpc_logs");
  return logs ? JSON.parse(logs) : [];
};

export const agregarLog = (accion: string, detalles: string = "") => {
  const logs = obtenerLogs();
  const nuevoLog = { fecha: new Date().toISOString(), accion, detalles };
  localStorage.setItem("dmpc_logs", JSON.stringify([nuevoLog, ...logs]));
};

export const borrarLogs = () => {
  localStorage.removeItem("dmpc_logs");
};

export const obtenerNotas = (nombre: string) => {
  const notas = localStorage.getItem(`dmpc_notas_${nombre}`);
  if (!notas) return [];
  try {
    const parseadas = JSON.parse(notas);
    if (Array.isArray(parseadas)) return parseadas;
    if (typeof parseadas === "string") return [{ id: Date.now().toString(), texto: parseadas, fecha: new Date().toISOString() }];
    return [];
  } catch (e) {
    return [];
  }
};

export const guardarNotas = (nombre: string, notas: any[]) => {
  localStorage.setItem(`dmpc_notas_${nombre}`, JSON.stringify(notas));
};