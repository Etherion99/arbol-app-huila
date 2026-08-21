/**
 * Tipos del dominio de ÁrbolApp Huila.
 *
 * Se definen aquí, antes que el esquema SQL de la Fase 1, para que la app móvil
 * y el panel web compartan un único vocabulario.
 */

/** Estado del árbol en el terreno. Ver §0.1 de PROPUESTAS-DESARROLLO-FUTURO.md. */
export type EstadoArbol = 'vivo' | 'en_riesgo' | 'muerto' | 'replantado';

/** Estado de salud declarado por el guardián en cada entrada de bitácora. */
export type EstadoSalud = 'sano' | 'en_riesgo' | 'enfermo' | 'muerto';

/** Estado del ciclo de actualización bimestral, usado para pintar el marcador. */
export type EstadoSeguimiento = 'al_dia' | 'por_vencer' | 'vencido' | 'archivado' | 'muerto';

export type RolUsuario = 'guardian' | 'coordinador';

export type TipoZona = 'departamento' | 'municipio' | 'vereda';

/** Intervalo del recordatorio automático de bitácora. */
export const MESES_ENTRE_ACTUALIZACIONES = 2;

/** Días tras el vencimiento en los que se insiste al guardián. */
export const DIAS_DE_INSISTENCIA = [7, 21] as const;

/** Días tras el vencimiento en que el árbol se marca como vencido. */
export const DIAS_PARA_MARCAR_VENCIDO = 30;

/**
 * Normaliza el nombre de una especie escrita en texto libre para poder
 * contarla. El texto original que escribió el guardián se conserva aparte:
 * esta clave solo sirve para agrupar. Ver §0.5.
 *
 * `Mandarinos ` y `mandarino` producen la misma clave.
 */
export function normalizarEspecie(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // quita tildes
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/s$/, ''); // singulariza de forma simple: mandarinos -> mandarino
}
