import { listaCompleta, requisitos } from "../data/digimonData";

export interface FichaDigimon {
  nombre: string;
  etapa: string;
  rama: string;
  evolucionaA: string;
  requisito: string;
}

// Función para limpiar strings (elimina nulos, indefinidos y espacios)
const limpiar = (valor: any): string => {
  if (typeof valor !== "string") return "";
  return valor.trim();
};

// Función para buscar el requisito de una rama y etapa
const obtenerRequisito = (rama: string, etapa: string): string => {
  if (!rama || !etapa) return "No definido";
  
  const req = requisitos.find((r: any) => limpiar(r.RAMA) === limpiar(rama));
  if (!req) return "No definido";

  let columna = "";
  if (etapa === "BB1") columna = "De BB1 a BB2";
  else if (etapa === "BB2") columna = "De BB2 a CHILD";
  else if (etapa === "CHILD") columna = "De CHILD a ADULT";
  else if (etapa === "ADULT") columna = "De ADULT a PERFECT";
  else if (etapa === "PERFECT") columna = "De PERFECT a ULTIMATE";
  else if (etapa === "ULTIMATE") columna = "De ULTIMATE a SUPER ULTIMATE";

  if (!columna) return "No definido";
  
  const texto = limpiar(req[columna]);
  return texto || "No definido";
};

// --- DATOS PROCESADOS ---

// Lista de familias únicas y limpias
export const FAMILIAS_SEGURAS: string[] = Array.from(
  new Set(listaCompleta.map((d: any) => limpiar(d.Familia)).filter((f: string) => f !== ""))
).sort();

// Lista de etapas en orden
export const ETAPAS_SEGURAS = ["BB1", "BB2", "CHILD", "ADULT", "PERFECT", "ULTIMATE", "SUPER ULTIMATE"];

// Diccionario de Digimons por familia y etapa (solo nombres únicos para mostrar en la lista)
export const DIGIMONS_SEGUROS: Record<string, Record<string, string[]>> = {};

// Diccionario de información detallada por familia y nombre de Digimon
export const INFO_DIGIMONS_SEGUROS: Record<string, Record<string, {
  etapa: string;
  preEvoluciones: { nombre: string; rama: string }[];
  evoluciones: { nombre: string; rama: string; requisito: string }[];
}>> = {};

// Procesamos los datos
FAMILIAS_SEGURAS.forEach(familia => {
  DIGIMONS_SEGUROS[familia] = {};
  INFO_DIGIMONS_SEGUROS[familia] = {};
  
  ETAPAS_SEGURAS.forEach(etapa => {
    DIGIMONS_SEGUROS[familia][etapa] = [];
  });

  // Filtramos solo las filas de esta familia que tengan nombre
  const filasFamilia = listaCompleta.filter(
    (d: any) => limpiar(d.Familia) === familia && limpiar(d.Digimon) !== ""
  );

  // Agrupamos por nombre de Digimon
  const nombresUnicos = Array.from(new Set(filasFamilia.map((d: any) => limpiar(d.Digimon))));

  nombresUnicos.forEach(nombre => {
    // Buscamos TODAS las filas de este Digimon en esta familia
    const filasDigimon = filasFamilia.filter((d: any) => limpiar(d.Digimon) === nombre);
    if (filasDigimon.length === 0) return;

    const primeraFila = filasDigimon[0];
    const etapa = limpiar(primeraFila.Etapa) || "Desconocida";

    // Añadimos a la lista de la etapa (solo una vez por nombre)
    if (!DIGIMONS_SEGUROS[familia][etapa]) DIGIMONS_SEGUROS[familia][etapa] = [];
    if (!DIGIMONS_SEGUROS[familia][etapa].includes(nombre)) {
      DIGIMONS_SEGUROS[familia][etapa].push(nombre);
    }

    // Pre-evoluciones: Buscamos todas las filas que evolucionan a este Digimon
    const preEvoluciones = listaCompleta
      .filter((d: any) => limpiar(d.Familia) === familia && limpiar(d["Evoluciona A"]) === nombre)
      .map((d: any) => ({
        nombre: limpiar(d.Digimon),
        rama: limpiar(d.Rama)
      }))
      .filter(p => p.nombre !== "");

    // Evoluciones: Tomamos TODAS las filas de este Digimon que tengan "Evoluciona A"
    const evoluciones = filasDigimon
      .filter((d: any) => limpiar(d["Evoluciona A"]) !== "")
      .map((d: any) => ({
        nombre: limpiar(d["Evoluciona A"]),
        rama: limpiar(d.Rama),
        requisito: obtenerRequisito(limpiar(d.Rama), etapa)
      }))
      .filter(e => e.nombre !== "");

    INFO_DIGIMONS_SEGUROS[familia][nombre] = {
      etapa,
      preEvoluciones,
      evoluciones
    };
  });

  // Ordenamos las listas de cada etapa
  ETAPAS_SEGURAS.forEach(etapa => {
    if (DIGIMONS_SEGUROS[familia][etapa]) {
      DIGIMONS_SEGUROS[familia][etapa].sort((a, b) => a.localeCompare(b));
    }
  });
});

// --- FUNCIONES AUXILIARES PARA EL APP ---

export const obtenerFichasDeDigimon = (familia: string, nombre: string): FichaDigimon[] => {
  if (!familia || !nombre) return [];
  const filas = listaCompleta.filter(
    (d: any) => limpiar(d.Familia) === limpiar(familia) && limpiar(d.Digimon) === limpiar(nombre)
  );
  
  if (filas.length === 0) return [];

  const etapa = limpiar(filas[0].Etapa) || "Desconocida";

  return filas.map((f: any) => ({
    nombre: limpiar(f.Digimon),
    etapa: etapa,
    rama: limpiar(f.Rama),
    evolucionaA: limpiar(f["Evoluciona A"]),
    requisito: obtenerRequisito(limpiar(f.Rama), etapa)
  }));
};

export const obtenerPreEvoluciones = (familia: string, nombre: string) => {
  if (!familia || !nombre) return [];
  return listaCompleta
    .filter((d: any) => limpiar(d.Familia) === limpiar(familia) && limpiar(d["Evoluciona A"]) === limpiar(nombre))
    .map((d: any) => ({
      nombre: limpiar(d.Digimon),
      rama: limpiar(d.Rama)
    }))
    .filter(p => p.nombre !== "");
};