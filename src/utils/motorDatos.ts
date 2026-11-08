import { listaCompleta, requisitos, TIEMPOS_EVOLUCION, PESOS_IDEALES } from "../data/digimonData";

export interface FichaDigimon {
  nombre: string;
  etapa: string;
  rama: string;
  evolucionaA: string;
  requisito: string;
  tiempoRequerido: string;
  pesoRecomendado: string;
}

const limpiar = (valor: any): string => {
  if (typeof valor !== "string") return "";
  return valor.trim();
};

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

  const texto = limpiar((req as any)[columna]);
  return texto || "No definido";
};

export const FAMILIAS_SEGURAS: string[] = Array.from(
  new Set(listaCompleta.map((d: any) => limpiar(d.Familia)).filter((f: string) => f !== ""))
).sort();

export const ETAPAS_SEGURAS = ["BB1", "BB2", "CHILD", "ADULT", "PERFECT", "ULTIMATE", "SUPER ULTIMATE"];

export const DIGIMONS_SEGUROS: Record<string, Record<string, string[]>> = {};
export const INFO_DIGIMONS_SEGUROS: Record<string, Record<string, {
  etapa: string;
  preEvoluciones: { nombre: string; rama: string }[];
  evoluciones: { nombre: string; rama: string; requisito: string; tiempoRequerido: string; pesoRecomendado: string }[];
}>> = {};

FAMILIAS_SEGURAS.forEach(familia => {
  DIGIMONS_SEGUROS[familia] = {};
  INFO_DIGIMONS_SEGUROS[familia] = {};

  ETAPAS_SEGURAS.forEach(etapa => {
    DIGIMONS_SEGUROS[familia][etapa] = [];
  });

  const filasFamilia = listaCompleta.filter(
    (d: any) => limpiar(d.Familia) === familia && limpiar(d.Digimon) !== ""
  );

  const nombresUnicos = Array.from(new Set(filasFamilia.map((d: any) => limpiar(d.Digimon))));

  nombresUnicos.forEach(nombre => {
    const filasDigimon = filasFamilia.filter((d: any) => limpiar(d.Digimon) === nombre);
    if (filasDigimon.length === 0) return;

    const primeraFila = filasDigimon[0];
    const etapa = limpiar(primeraFila.Etapa) || "Desconocida";

    if (!DIGIMONS_SEGUROS[familia][etapa]) DIGIMONS_SEGUROS[familia][etapa] = [];
    if (!DIGIMONS_SEGUROS[familia][etapa].includes(nombre)) {
      DIGIMONS_SEGUROS[familia][etapa].push(nombre);
    }

    const preEvoluciones = listaCompleta
    .filter((d: any) => limpiar(d.Familia) === familia && limpiar(d["Evoluciona A"]) === nombre)
    .map((d: any) => ({
      nombre: limpiar(d.Digimon),
                      rama: limpiar(d.Rama)
    }))
    .filter(p => p.nombre !== "");

    const evoluciones = filasDigimon
    .filter((d: any) => limpiar(d["Evoluciona A"]) !== "")
    .map((d: any) => ({
      nombre: limpiar(d["Evoluciona A"]),
                      rama: limpiar(d.Rama),
                      requisito: obtenerRequisito(limpiar(d.Rama), etapa),
                      tiempoRequerido: TIEMPOS_EVOLUCION[etapa] ? `${TIEMPOS_EVOLUCION[etapa]} Horas` : "No definido",
                      pesoRecomendado: PESOS_IDEALES[etapa] || "No definido"
    }))
    .filter(e => e.nombre !== "");

    INFO_DIGIMONS_SEGUROS[familia][nombre] = {
      etapa,
      preEvoluciones,
      evoluciones
    };
  });

  ETAPAS_SEGURAS.forEach(etapa => {
    if (DIGIMONS_SEGUROS[familia][etapa]) {
      DIGIMONS_SEGUROS[familia][etapa].sort((a, b) => a.localeCompare(b));
    }
  });
});

export const obtenerFichasDeDigimon = (familia: string, nombre: string): FichaDigimon[] => {
  if (!familia || !nombre) return [];
  const filas = listaCompleta.filter(
    (d: any) => limpiar(d.Familia) === limpiar(familia) && limpiar(d.Digimon) === limpiar(nombre)
  );

  if (filas.length === 0) return [];

  return filas.map((f: any) => {
    const etapaActual = limpiar(f.Etapa) || "Desconocida";
    return {
      nombre: limpiar(f.Digimon),
                   etapa: etapaActual,
                   rama: limpiar(f.Rama),
                   evolucionaA: limpiar(f["Evoluciona A"]),
                   requisito: obtenerRequisito(limpiar(f.Rama), etapaActual),
                   tiempoRequerido: TIEMPOS_EVOLUCION[etapaActual] ? `${TIEMPOS_EVOLUCION[etapaActual]} Horas` : "No definido",
                   pesoRecomendado: PESOS_IDEALES[etapaActual] || "No definido"
    };
  });
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
