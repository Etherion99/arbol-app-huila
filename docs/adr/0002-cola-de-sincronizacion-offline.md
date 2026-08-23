# ADR 0002 — Cola de sincronización offline

> 23 de agosto de 2026 · Estado: **aceptada**

## Contexto

En las veredas la señal es intermitente. Antes de esta cola, el asistente de siembra y la
bitácora escribían directo contra Supabase: si la señal caía a mitad de la subida, el
guardián había caminado hasta el árbol, hecho el trabajo y tomado la fotografía, y la
aplicación le decía que lo intentara más tarde — sin ningún «más tarde» en el que la
aplicación participara. La regla de dominio ya lo decía («toda escritura del móvil pasa por
la cola de sincronización offline»); lo que faltaba era la cola.

Una entrada de bitácora no se puede repetir: es la fotografía de un árbol tal como estaba
esa mañana. Una escritura perdida no es un reintento, es una visita borrada.

## Decisión

Una cola persistente en `apps/mobile/src/features/sync/`, partida en cuatro piezas:

| Archivo | Qué es |
|---|---|
| `sync-queue-model.ts` | Tipos, esquema en disco, orden, escalera de reintentos y lectura de fallos. Puro. |
| `sync-queue-engine.ts` | La máquina de estados y el bucle de vaciado. Puro, sobre puertos. |
| `sync-queue-storage.ts` | El puerto de disco, con `expo-file-system`. |
| `sync-queue-transport.ts` | El puerto de red, con Supabase. |

**El modelo y el motor no importan plataforma**: ni Expo, ni Supabase, ni React, ni reloj
propio. Todo entra por puertos. Eso es lo que permite que `pnpm test:offline` ejecute el
código real —no una copia— contra un reloj virtual, un radio falso y un servidor falso.

### El orden que sí es seguro

Filas primero, fotografía después, y la respuesta de lo primero escrita en disco antes de
intentar lo segundo. Las políticas de Storage leen el identificador del árbol del nombre del
objeto, así que no se puede subir nada antes de que exista la fila que lo posee; y al revés,
un fallo entre ambos dejaría un objeto que nadie puede alcanzar. Lo que cuesta este orden es
un trabajo a medias —filas en el servidor, fotografía en el teléfono— y eso es exactamente
lo que una cola sabe llevar: el campo `target` lo registra y el reintento es una resubida a
una clave que es función pura del árbol y el ciclo.

### Idempotencia

- **Bitácora:** el índice único sobre `(tree_id, cycle)` convierte un segundo intento en un
  `23505`, que la cola lee como **recibo y no como error** — la fila ya está, solo queda la
  subida.
- **Siembra:** `register_tree()` no es idempotente. La ventana peligrosa es entre el commit
  y la respuesta que nunca llega. Se marca `submittedAt` en disco **antes** de la llamada,
  y un trabajo que reaparece con esa marca y sin `target` **le pregunta al servidor** en vez
  de escribir otra vez: busca su ciclo 1 por `captured_at`, que viene del EXIF de una sola
  fotografía y no lo comparten dos entradas.

### Orden por árbol

De cada árbol solo puede correr su trabajo más antiguo. El ciclo 2 no sube antes que el 1.
Árboles distintos no se bloquean entre sí: una subida que falla en una vereda no puede
retener a los diez trabajos que van detrás.

### Nada se borra sin confirmar

Un trabajo sale de la cola en un solo sitio: después de que la subida resuelva. La
fotografía se borra del teléfono en el mismo gesto y nunca antes.

## Qué pasa si la cola crece durante semanas sin red

**No se descarta nada.** Ni por antigüedad, ni por tamaño, ni por número de intentos. Quien
caminó a once árboles en tres fines de semana tiene once fotografías y ninguna forma de
volver a tomarlas.

Lo que sí está acotado:

- **La espera entre intentos tiene techo** (15 s → 15 min), así que una caída larga cuesta
  un goteo fijo de intentos y no uno creciente. Y solo se intenta cuando el radio dice que
  hay conexión: una semana en una vereda cuesta **cero** intentos.
- **Pasados 40 registros o 30 MB se avisa** en la pantalla que los lista. Es una frase, no
  una negativa: la alternativa sería decirle a alguien que está frente a un árbol que no
  puede registrarlo. Cuarenta trabajos son unos nueve megabytes.
- **Un trabajo que nunca podrá terminar deja de reintentar** y dice por qué, con las dos
  acciones que sí son del guardián: reintentar ahora, o descartarlo. Descartar es el único
  camino que suelta trabajo sin enviar, y lo pulsa una persona.

## Consecuencias

- El asistente de siembra y la bitácora ya no fallan: encolan. Lo que reportan es cuál de
  las dos cosas le pasó a ese trabajo — lo tiene el servidor, o lo tiene este teléfono.
- El borrador del asistente se limpia en cuanto el trabajo entra en la cola, no al terminar
  la espera: si no, un teléfono muerto en ese hueco volvería con un trabajo encolado **y** un
  borrador ofreciendo sembrar el mismo árbol otra vez.
- El número de ciclo se calcula contando también lo encolado. Quien registra un ciclo el
  sábado sin señal y vuelve al mismo árbol el domingo no puede recibir el mismo número.
- `packages/core` no cambia. La cola es del móvil.

## Alternativas descartadas

- **Reintentar con las mutaciones de TanStack Query.** Sus reintentos viven en memoria y
  mueren con el proceso, que es justo el caso que hay que cubrir. La cola sí usa su
  `onlineManager`, que ya está cableado a NetInfo, en vez de abrir una segunda suscripción.
- **Una clave de idempotencia en `register_tree()`.** Sería más limpio que preguntar por
  `captured_at`, y es un cambio de esquema con más radio de acción del que este trabajo
  justifica. Queda anotado por si la función se toca por otro motivo.
- **Meter las fotografías en el propio archivo de la cola.** El archivo se reescribe entero
  en cada intento; doscientos kilobytes por entrada dentro convertirían cada reintento en
  una reescritura de megabytes y un corte de luz se llevaría las fotografías con la cola.
