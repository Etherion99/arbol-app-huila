/**
 * Punto único desde el que las pantallas de la app consumen el diseño.
 * Los valores viven en packages/core para que la app y el panel web no se
 * desincronicen cuando llegue la identidad visual definitiva.
 */
export { colores, colorPorEstado, espaciado, radios } from '@arbolapp/core';
export type { EstadoSeguimiento, EstadoArbol, EstadoSalud } from '@arbolapp/core';
