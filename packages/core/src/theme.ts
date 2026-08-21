/**
 * Paleta PROVISIONAL de ÁrbolApp Huila.
 *
 * Todo el color de la app y de la web sale de este archivo. Cuando llegue la
 * identidad visual definitiva (Fase 9), se cambian estos valores y no hay que
 * tocar ninguna pantalla.
 *
 * Los tres estados de seguimiento son los que pintan los marcadores del mapa,
 * de modo que el coordinador vea la salud del proyecto de un vistazo.
 */

export const colores = {
  /** Árbol al día: bitácora actualizada dentro del ciclo de 2 meses. */
  activo: '#2ECC71',
  /** Árbol por actualizar: el ciclo venció y aún no llega la foto. */
  porActualizar: '#F1C40F',
  /** Árbol archivado o sin guardián asignado. */
  archivado: '#7F8C8D',
  /** Árbol reportado como muerto. */
  muerto: '#C0392B',

  /** Fondo oscuro del mapa, para que los marcadores se lean como puntos de luz. */
  fondoMapa: '#0B1F16',
  fondo: '#0F172A',
  superficie: '#1E293B',
  borde: '#334155',

  texto: '#F8FAFC',
  textoSecundario: '#94A3B8',
  textoSobreClaro: '#0F172A',

  primario: '#2ECC71',
  primarioOscuro: '#27AE60',
  peligro: '#E74C3C',
} as const;

/** Color del marcador según el estado de seguimiento del árbol. */
export const colorPorEstado = {
  al_dia: colores.activo,
  por_vencer: colores.porActualizar,
  vencido: colores.porActualizar,
  archivado: colores.archivado,
  muerto: colores.muerto,
} as const;

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radios = {
  sm: 6,
  md: 12,
  lg: 20,
  completo: 9999,
} as const;

export type ClaveColor = keyof typeof colores;
