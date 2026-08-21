# ADR 0001 — Librería de mapas de la aplicación móvil

> 21 de agosto de 2026 · Fase 3 · Estado: **aceptada**

## Contexto

El mapa es la pantalla de entrada de ÁrbolApp Huila y su pieza central. El diseño
(`guidelines/map-motif.html` y `ui_kits/mobile/MapScreen.jsx`) lo define como un **mapa
oscuro** sobre el que los árboles se leen como **puntos de luz**: la base tiene que ser
tenue y homogénea para que el marcador sea lo más brillante de la pantalla y la leyenda de
cinco estados siga siendo legible.

La decisión se dejó abierta al iniciar la fase porque las dos candidatas se diferencian
justo en lo que el diseño necesita. El proyecto está en **React Native 0.86** y
**Expo SDK 57**, y RN eliminó la arquitectura antigua a partir de 0.82: cualquier módulo
nativo que se elija tiene que traer componentes **Fabric**, no basta con que su rango de
compatibilidad declarado lo permita.

## Alternativas

### `react-native-maps`

- **Google Maps en Android y en iOS**, con el mismo JSON de estilo en ambas. Es lo único
  que sostiene el motivo nocturno en iPhone.
- `codegenConfig` con `type: "all"` y el juego completo de *specs* (`src/specs/`), más el
  `componentProvider` de iOS: es **nueva arquitectura de verdad**, no un envoltorio sobre
  el puente antiguo.
- `onRegionChangeComplete` entrega `{latitude, longitude, latitudeDelta, longitudeDelta}`,
  es decir **un rectángulo exacto**, que es literalmente la entrada de
  `trees_in_viewport()`.
- Tiene `tracksViewChanges` por marcador, que el plan y el diseño exigen de forma
  explícita.
- Trae *config plugin* de Expo (`app.plugin.js`) que escribe
  `com.google.android.geo.API_KEY` en el manifiesto de Android y `GMSApiKey` en el
  `Info.plist` de iOS.
- `minSdkVersion` 21, muy por debajo del Android 8 (API 26) que es el objetivo de gama
  baja.

### `expo-maps`

- Es de primera parte y encaja sin fricción con el SDK.
- **Usa Apple Maps en iOS** (`ios/AppleMapsView.swift`). El estilo JSON de Google no
  aplica ahí: `mapStyleOptions` solo existe en el lado `google/`, que es Android.
- Su vista de Apple Maps exige **iOS 17 o superior** (`AppleMapsViewiOS17.swift`,
  `AppleMapsViewiOS18.swift`), lo que recorta el parque de iPhone alcanzable.
- `onCameraMove` entrega **solo centro y zoom**, no el rectángulo visible. Derivar el
  recuadro a mano desde centro, zoom y tamaño de la vista es aritmética de Mercator que se
  rompe en cuanto hay inclinación, y la corrección del viewport es un requisito verificado
  de esta fase.

## Decisión

**`react-native-maps`, versión `1.27.2`.**

La versión es la que la matriz de compatibilidad de Expo SDK 57 declara, no la última
publicada. Se instaló primero `1.29.0` y `npx expo-doctor` la marcó como desalineada
(20/21); `1.27.2` conserva todo lo que esta fase usa —`PROVIDER_GOOGLE`,
`customMapStyle`, `tracksViewChanges`, `onRegionChangeComplete`, codegen Fabric `type:
"all"` y el config plugin— y deja el chequeo en 21/21.

## Consecuencias

- El motivo de "puntos de luz" se sostiene igual en Android y en iPhone, con **un solo**
  JSON de estilo generado desde los tokens de `packages/core`.
- La carga por viewport es directa: el rectángulo que reporta el mapa entra tal cual en
  `trees_in_viewport()`, sin conversiones que puedan desalinearse.
- Se depende de una API key de Google **por plataforma**. Sin ella el mapa renderiza en
  gris sobre Android. Las claves se leen del entorno en `app.config.js` y nunca se
  versionan; el plugin recibe el objeto vacío cuando no hay clave, con lo que **retira** la
  entrada del manifiesto en vez de escribir un valor falso.
- Se asume una dependencia nativa de tercero en la pieza más importante de la aplicación.
  El mitigante es que trae codegen de nueva arquitectura completo y config plugin propio,
  así que no hay parches manuales sobre el proyecto nativo.
- **Riesgo abierto:** `1.27.2` registra cuatro componentes en el `componentProvider` de
  iOS (`RNMapsGoogleMapView`, `RNMapsGooglePolygon`, `RNMapsMapView`, `RNMapsMarker`),
  mientras que `1.29.0` añade `RNMapsGoogleMarker` y `RNMapsPolygon`. No se pudo comprobar
  si eso afecta a los marcadores sobre el proveedor Google en iOS, porque en este equipo no
  hay forma de compilar para iOS. **Hay que verificarlo en la primera compilación de iOS**;
  si aparece, subir a `1.29.0` y excluir el paquete de la validación de dependencias.

## Lo que esta decisión NO pudo apoyarse en

La instrucción pedía resolver esto **con un prototipo, no con una opinión**, y eso se
cumplió solo a medias, por una razón del entorno y no de criterio:

- En este equipo **no hay Android SDK, ni `adb`, ni emulador, ni Gradle**
  (`ANDROID_HOME` vacío, `%LOCALAPPDATA%\Android` no existe). Hay Java 17, pero eso no
  basta.
- Es Windows, así que iOS queda fuera por definición.
- **No existe `.env`**, así que tampoco hay API key de Google Maps.

Por tanto **no se compiló ninguna de las dos librerías**. Lo que sí se hizo fue inspeccionar
los paquetes publicados de ambas —`codegenConfig`, *specs* de Fabric, `build.gradle`,
fuentes Swift, tipos de eventos y config plugins— y decidir sobre esa evidencia, que es
verificable y está citada arriba. La comprobación pendiente es una sola y hay que hacerla en
cuanto haya un dispositivo: **que la app arranque y el mapa pinte**.
