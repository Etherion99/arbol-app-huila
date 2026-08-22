/**
 * Every string the guardian reads, grouped by screen. Copy never lives inside
 * a component: keeping it here is what makes a wording review possible without
 * touching logic, and leaves the door open for translation later.
 *
 * Written in Spanish, addressing the reader as "tú" or impersonally. Never
 * voseo: the project is in Huila, where nobody says "ingresá".
 */

/**
 * What each tracking state is called. Named once and shared, because the map
 * legend, the state badge and the tree list all have to say the same word: a
 * tree that reads "Vencido" on the map and "Atrasado" in the list looks like
 * two different states to the guardian reading them.
 */
const treeStateLabels = {
  up_to_date: 'Al día',
  due_soon: 'Por actualizar',
  overdue: 'Vencido',
  dead: 'Muerto',
  archived: 'Archivado',
} as const;

export const texts = {
  /** The five tracking states, for any surface that names one. */
  treeState: treeStateLabels,

  /** Copy belonging to the interface catalogue rather than to a screen. */
  ui: {
    selectPlaceholder: 'Selecciona…',
    selectOpen: (label: string) => `Abrir la lista de ${label}`,
    removeTag: (label: string) => `Quitar ${label}`,
    dialogClose: 'Cerrar el diálogo',
  },

  common: {
    appName: 'ÁrbolApp Huila',
    continue: 'Continuar',
    cancel: 'Cancelar',
    retry: 'Reintentar',
    back: 'Volver',
    close: 'Cerrar',
    loading: 'Cargando…',
    save: 'Guardar cambios',
    saving: 'Guardando…',
    offlineBanner: 'Sin conexión. Revisa tus datos o el wifi para continuar.',
    offlineHint: 'Sin conexión. Necesitas señal para continuar.',
    /** Reachable from every screen a reader can land on, with or without an account. */
    legalLink: 'Política de privacidad y términos',
  },

  config: {
    title: 'Falta configurar la aplicación',
    body: 'La app no encuentra los datos del servidor. Copia el archivo .env.example a .env y completa estas variables:',
    hint: 'Después de completarlas, reinicia el servidor de desarrollo.',
  },

  onboarding: {
    skip: 'Omitir',
    next: 'Siguiente',
    start: 'Empezar',
    exploreAsGuest: 'Explorar sin cuenta',
    alreadyHaveAccount: 'Ya tengo cuenta',
    stepLabel: (current: number, total: number) => `Paso ${current} de ${total}`,
    /**
     * Caption of the field photograph, one per step that has one. The third
     * step shows the public map rather than a picture, so there are two of
     * these and three steps. Placeholders until the PRAE supplies the files.
     */
    photoCaptions: [
      'Foto real de campo · vereda San Andrés',
      'Foto real de campo · guardiana y su mandarino',
    ],
    steps: [
      {
        title: 'Siembra un árbol y ponlo en el mapa',
        body: 'Cada árbol frutal del Huila se vuelve un punto de luz que toda la comunidad puede ver.',
      },
      {
        title: 'Cada dos meses, una foto y sus medidas',
        body: 'La bitácora guarda la altura y las ramas de tu árbol. Te avisaremos cuando toque.',
      },
      {
        title: 'El Huila ve crecer el bosque',
        body: 'El mapa es público: tu colegio, tu vereda y tu municipio pueden seguir cada siembra.',
      },
    ],
  },

  signUp: {
    title: 'Crear cuenta',
    subtitle: 'Necesitas un correo válido: por ahí llegan los recordatorios de tus árboles.',
    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: 'Ana María Perdomo',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'nombre@iesansebastian.edu.co',
    institutionLabel: 'Institución u organización (opcional)',
    institutionPlaceholder: 'I.E. San Sebastián',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Mínimo 8 caracteres',
    adultLabel: 'Declaro que soy mayor de 18 años',
    termsLabel: 'Acepto la política de privacidad y los términos de uso',
    /** Fragments of `termsLabel` rendered as links. Must match it literally. */
    privacyPolicyLink: 'política de privacidad',
    termsOfUseLink: 'términos de uso',
    consentHelper:
      'Para crear la cuenta debes confirmar tu mayoría de edad y aceptar los términos.',
    passwordRequirement: 'Mínimo 8 caracteres.',
    submit: 'Crear cuenta',
    submitting: 'Creando la cuenta…',
    haveAccount: 'Ya tengo cuenta, entrar',
    showPassword: 'Mostrar la contraseña',
    hidePassword: 'Ocultar la contraseña',
  },

  signIn: {
    title: 'Entra a tu cuenta',
    subtitle: 'Entra con el correo con el que te registraste.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'nombre@iesansebastian.edu.co',
    passwordLabel: 'Contraseña',
    submit: 'Entrar',
    submitting: 'Entrando…',
    forgotPassword: '¿Olvidaste tu contraseña?',
    noAccount: 'Crear cuenta de guardián',
    /** Separates having an account from not needing one. */
    or: 'O',
    exploreAsGuest: 'Explorar sin cuenta',
    sessionExpired: 'Tu sesión se cerró por seguridad. Vuelve a entrar para continuar.',
    passwordUpdated: 'Contraseña actualizada. Entra con la nueva.',
  },

  verifyEmail: {
    title: 'Revisa tu correo',
    /**
     * Split around the address rather than interpolated into one string, so the
     * address can be set apart from the sentence around it: it is the one thing
     * on this screen a guardian has to check against the inbox in front of them.
     */
    bodyBeforeEmail: 'Enviamos un enlace de verificación a ',
    bodyAfterEmail: '. Ábrelo desde este teléfono.',
    checkSpam: 'Si no lo ves, revisa la carpeta de correo no deseado.',
    resend: 'Reenviar correo',
    resendCountdown: (seconds: number) => `Reenviar en 0:${String(seconds).padStart(2, '0')}`,
    resendSent: 'Te enviamos un correo nuevo. Revisa tu bandeja.',
    resending: 'Reenviando…',
    alreadyConfirmed: 'Ya verifiqué mi correo',
    confirming: 'Confirmando tu cuenta…',
    stillUnverified:
      'Tu correo aún no aparece verificado. Abre el enlace del mensaje y vuelve a intentar.',
    useAnotherEmail: 'Cambiar de correo',
  },

  forgotPassword: {
    title: 'Recuperar contraseña',
    subtitle:
      'Escribe el correo con el que te registraste y te enviaremos un enlace para restablecerla.',
    emailLabel: 'Correo electrónico',
    submit: 'Enviar enlace',
    submitting: 'Enviando…',
    sentTitle: 'Revisa tu correo',
    sentBody: (email: string) =>
      `Si existe una cuenta con ${email}, recibirás un enlace para restablecer tu contraseña. Revisa también el correo no deseado.`,
    sentHint:
      'Por seguridad no confirmamos si un correo está registrado. El enlace vence en una hora.',
    backToSignIn: 'Volver a iniciar sesión',
  },

  resetPassword: {
    title: 'Nueva contraseña',
    subtitle: 'Elige una contraseña que no uses en otro lado.',
    passwordLabel: 'Contraseña nueva',
    submit: 'Guardar contraseña',
    submitting: 'Guardando…',
    cancel: 'Cancelar y volver a iniciar sesión',
    linkExpiredTitle: 'El enlace ya no sirve',
    linkExpiredBody: 'Este enlace ya venció. Pide uno nuevo desde «¿Olvidaste tu contraseña?».',
    requestAnother: 'Pedir un enlace nuevo',
  },

  profile: {
    title: 'Mi perfil',
    guardianRole: 'Guardián',
    coordinatorRole: 'Coordinación',
    /** The distinction pill of the profile card, which the canvas dates by year. */
    memberSinceYear: (role: string, year: string) => `${role} desde ${year}`,
    /** The line under the name. The role alone when nobody typed an institution. */
    roleAndInstitution: (role: string, institution: string) => `${role} · ${institution}`,
    avatarLabel: (fullName: string) => `Iniciales de ${fullName}`,
    statTreesLabel: 'Árboles',
    statUpToDateLabel: 'Al día',
    statCyclesLabel: 'Ciclos',
    /** Read aloud in place of the dash a figure with no source draws. */
    statUnavailable: 'sin dato',
    statsErrorMessage: 'No pudimos contar tus árboles. Puedes seguir usando el resto del perfil.',
    editProfile: 'Editar perfil',
    notificationSettings: 'Ajustes de notificaciones',
    versionFooter: (version: string) => `v${version} · UN PROYECTO DE JUVENTUD EN LÍNEA`,
    emailLabel: 'Correo electrónico',
    emailHint:
      'El correo no se puede cambiar por ahora. Escribe a la coordinación si lo necesitas.',
    fullNameLabel: 'Nombre completo',
    institutionLabel: 'Institución u organización',
    institutionPlaceholder: 'Sin institución',
    adultConfirmed: 'Mayoría de edad declarada',
    termsAcceptedAt: (date: string) => `Términos aceptados el ${date}`,
    saved: 'Tus datos quedaron guardados.',
    legalLink: 'Política de privacidad y términos',
    signOut: 'Cerrar sesión',
    signOutTitle: '¿Cerrar sesión?',
    signOutBody: 'Tendrás que escribir tu correo y tu contraseña la próxima vez que entres.',
    signOutConfirm: 'Sí, cerrar sesión',
    missingProfileTitle: 'No encontramos tu perfil',
    missingProfileBody:
      'Tu cuenta existe pero no tiene perfil de Guardián. Cierra sesión y vuelve a entrar; si sigue igual, escribe a la coordinación del PRAE.',
    loadErrorTitle: 'No pudimos cargar tu perfil',
  },

  /** The notification settings, reached from the row of the same name in the profile. */
  notificationSettings: {
    title: 'Notificaciones',
    /**
     * Not in the canvas, which draws the screen as if it worked. Nothing is
     * sent and nothing is stored yet, and a switch that silently forgets what
     * the guardian chose has to say so before it is touched.
     */
    inactiveNotice:
      'El envío de notificaciones todavía no está activo. Por ahora estos interruptores no cambian nada y lo que elijas no se guarda al salir.',
    comingSoon: 'Disponible próximamente',
    remindersLabel: 'Recordatorios de bitácora',
    remindersDescription: 'Un aviso cuando a un árbol tuyo le toque su foto bimestral',
    coordinatorLabel: 'Avisos del coordinador',
    coordinatorDescription: 'Archivados, reasignaciones y mensajes del PRAE',
    pendingFootnote:
      'Aunque desactives los avisos, tus árboles seguirán apareciendo como pendientes en la app.',
  },

  map: {
    tabLabel: 'Mapa',
    profileTabLabel: 'Perfil',
    guestNotice: 'Estás explorando sin cuenta. Puedes mirar el mapa, pero no registrar árboles.',
    guestAction: 'Crear cuenta de Guardián',
    guestSignIn: 'Entrar',
    guestLegal: 'Privacidad y términos',

    searchPlaceholder: 'Buscar árbol o vereda…',
    searchLabel: 'Buscar un árbol o una vereda',
    searchHint: 'Escribe el nombre de una vereda o el código de un árbol, como HUI-LP-0042.',
    searchZonesHeading: 'Veredas y municipios',
    searchTreesHeading: 'Árboles',
    searchNoResults: (query: string) => `No encontramos nada que coincida con «${query}».`,
    myLocation: 'Centrar en mi ubicación',

    municipalityFilter: 'Municipio',
    villageFilter: 'Vereda',
    speciesFilter: 'Especie',
    clearFilter: (name: string) => `Quitar el filtro ${name}`,
    allMunicipalities: 'Todos los municipios',
    allVillages: 'Todas las veredas',
    allSpecies: 'Todas las especies',
    treeCount: (count: number) => (count === 1 ? '1 árbol' : `${count} árboles`),

    legendTitle: 'Estados',
    legend: treeStateLabels,

    clusterLabel: (count: number, zone: string) => `${count} árboles en ${zone}`,
    clusterLabelPlain: (count: number) => `Grupo de ${count} árboles`,
    markerLabel: (species: string, state: string) => `Árbol de ${species}, ${state}`,

    loadingTrees: 'Cargando los árboles…',
    emptyTitle: 'Aquí todavía no hay árboles',
    emptyBody: 'Mueve el mapa o quita los filtros para ver otras zonas del proyecto.',
    errorTitle: 'No pudimos cargar los árboles',
    errorBody: 'Revisa tu conexión y vuelve a intentarlo.',
    offlineCached: 'Sin conexión. Estás viendo la última zona guardada.',
    locationDeniedTitle: 'Sin acceso a tu ubicación',
    locationDeniedBody:
      'El mapa funciona igual: se abre sobre La Plata y puedes moverlo con el dedo. Puedes permitir el acceso desde los ajustes del teléfono.',
    locationUnavailable: 'No pudimos leer tu ubicación ahora. Inténtalo de nuevo en un momento.',

    cardCycle: (cycle: number) => `CICLO ${cycle}`,
    cardNoCycle: 'SIN BITÁCORA',
    cardNoGuardian: 'Sin guardián asignado',
    cardUpdated: (date: string) => `Actualizado el ${date}`,
    cardNeverUpdated: 'Todavía sin actualizaciones',
    cardOpen: 'Ver árbol',
    cardClose: 'Cerrar la ficha del árbol',
    cardNoPhoto: 'Todavía sin fotografía',
    cardPhotoOf: (species: string) => `Última fotografía del árbol de ${species}`,
  },

  /**
   * The four step planting wizard. The step titles are the ones on the canvas;
   * the grouping follows the field form, where choosing a vereda is a decision
   * of its own and never a by-product of where the pin happened to land.
   */
  planting: {
    start: 'Sembrar',
    startFirst: 'Sembrar mi primer árbol',
    close: 'Salir del registro',
    stepLabel: (current: number, total: number) => `PASO ${current} DE ${total}`,
    progressLabel: (current: number, total: number) =>
      `Progreso del registro: paso ${current} de ${total}`,
    next: 'Siguiente',
    back: 'Atrás',

    draftFound: 'Tienes un registro a medias',
    draftFoundBody: (when: string) =>
      `Guardamos lo que llevabas el ${when}. Puedes continuar donde lo dejaste o empezar de nuevo.`,
    draftResume: 'Continuar',
    draftDiscard: 'Empezar de nuevo',
    draftSaved: 'Guardado en este teléfono',
    exitTitle: '¿Salir del registro?',
    exitBody:
      'Lo que llevas se queda guardado en este teléfono. Puedes continuar más tarde desde el mapa.',
    exitConfirm: 'Salir y guardar',
    exitCancel: 'Seguir aquí',

    locationTitle: 'Ubicación',
    locationHeading: '¿Dónde quedó sembrado?',
    locationHint: 'Arrastra el pin al punto exacto',
    locationAccuracy: (metres: number) => `±${Math.round(metres)} m`,
    locationAccuracyLabel: (metres: number) => `Precisión del GPS: ${Math.round(metres)} metros`,
    locationNoFix: 'Sin lectura del GPS',
    locationUseGps: 'Usar mi ubicación',
    locationPoorTitle: 'Señal de GPS débil',
    locationPoorBody: (metres: number) =>
      `Bajo los árboles el GPS pierde precisión (±${Math.round(metres)} m). Ajusta el pin al punto exacto de la siembra antes de continuar.`,
    locationDeniedTitle: 'Tu ubicación pone el árbol en su sitio',
    locationDeniedBody:
      'Usamos el GPS solo para ubicar los árboles que siembras y centrar el mapa. Funciona sin señal de datos.',
    locationAllow: 'Permitir ubicación',
    locationManualInstead: 'Ahora no — puedo escribir las coordenadas a mano',
    locationOpenSettings: 'Abrir ajustes del teléfono',
    manualToggle: 'Escribir coordenadas a mano',
    manualToggleClose: 'Volver al mapa',
    manualLatitude: 'Latitud',
    manualLongitude: 'Longitud',
    manualHint: 'En grados decimales, como 2.3894 y -75.8919.',
    manualApply: 'Poner el pin ahí',
    manualOutOfRange: 'Esa coordenada queda fuera del Huila. Revisa los números.',
    pinLabel: 'Pin de la siembra. Arrástralo para ajustarlo.',

    zoneTitle: 'Municipio y vereda',
    zoneHeading: '¿En qué vereda estás?',
    zoneBody:
      'Elígela tú. No la deducimos del mapa: todavía no existen los contornos de las veredas, y adivinarla dejaría un dato que nadie podría corregir después.',
    municipalityLabel: 'Municipio',
    villageLabel: 'Vereda',
    municipalityPlaceholder: 'Elige un municipio',
    villagePlaceholder: 'Elige una vereda',
    villageNeedsMunicipality: 'Primero elige el municipio.',
    suggestionTitle: 'Sugerencia',
    suggestionBody: (village: string, distance: string) =>
      `La vereda con el centro más cercano al pin es ${village}, a unos ${distance}. Es una estimación: confírmala o elige otra.`,
    suggestionAccept: (village: string) => `Sí, es ${village}`,
    zoneRequired: 'Elige el municipio y la vereda para continuar.',

    speciesTitle: 'Especie y siembra',
    speciesHeading: '¿Qué sembraste?',
    speciesBody:
      'Escribe la especie con tus palabras. Te sugerimos lo que otros guardianes ya han escrito.',
    speciesLabel: 'Especie',
    speciesPlaceholder: 'mandarino',
    speciesKeepsRawText:
      'Se guarda tal como lo escribas. El coordinador puede unificar nombres después.',
    speciesSearching: 'Buscando…',
    speciesNoMatches: 'Nadie ha escrito ese nombre todavía. El tuyo será el primero.',
    speciesSuggestionLabel: (name: string, count: number) =>
      `${name}, ${count === 1 ? '1 árbol' : `${count} árboles`}`,

    plantedAtLabel: 'Fecha de siembra',
    plantedAtToday: 'Hoy, por defecto',
    plantedAtDay: 'Día',
    plantedAtMonth: 'Mes',
    plantedAtYear: 'Año',
    plantedAtSetToday: 'Hoy',
    plantedAtInvalid: 'Esa fecha no existe. Revisa el día y el mes.',
    plantedAtFuture: 'La siembra no puede ser en el futuro.',
    heightLabel: 'Altura',
    heightUnit: 'cm',
    heightHint: 'Mide desde el suelo hasta la punta más alta',
    heightRequired: 'Escribe la altura en centímetros.',
    branchesLabel: 'Ramas visibles',
    branchesDecrease: 'Quitar una rama',
    branchesIncrease: 'Sumar una rama',

    photoTitle: 'Fotografía',
    photoHeading: 'La foto de la siembra',
    summaryHeading: 'RESUMEN',
    summarySpecies: 'Especie',
    summaryPlanting: 'Siembra',
    summaryLocation: 'Ubicación',
    summaryPhoto: 'Foto',
    summaryPhotoPending: 'Falta la fotografía',
    summaryPlantingValue: (date: string, height: number, branches: number) =>
      `${date} · ${height} cm · ${branches === 1 ? '1 rama' : `${branches} ramas`}`,
    submit: 'Sembrar árbol',
    submitting: 'Registrando…',

    successTitle: 'Tu árbol ya está en el mapa',
    successBody: (species: string, village: string) => `${species} · vereda ${village}`,
    /**
     * The whole sentence, for a screen reader. The screen draws the label and
     * the date as two pieces because the canvas sets the date in the mono face,
     * and hearing «Próxima foto, dos puntos» then a bare date is worse than
     * hearing it read once as one line.
     */
    successNextPhoto: (date: string) => `Próxima foto: ${date}`,
    successNextPhotoLabel: 'Próxima foto:',
    successNextPhotoLoading: 'Consultando la próxima fecha…',
    successNextPhotoFailed:
      'No pudimos consultar la próxima fecha. La encuentras en la ficha del árbol.',
    successCodeLabel: (code: string) => `Código del árbol: ${code}`,

    successNotifyTitle: '¿Te avisamos cuando toque la próxima foto?',
    successNotifyBody: 'Un solo aviso cada dos meses, por árbol. Nada más.',
    successNotifyAccept: 'Activar recordatorios',
    successNotifyDecline: 'Ahora no',
    /**
     * Not in the canvas, which draws the request as if pressing it armed
     * something. Nothing is armed: there is no permission to ask for and no
     * sender behind it, so the answer says so instead of pretending. The second
     * sentence is the same promise the notification settings already make.
     */
    successNotifyPending:
      'El envío de notificaciones todavía no está activo, así que este aviso no queda programado. Tu árbol seguirá apareciendo como pendiente en la app cuando le toque la foto.',
    successNotifyDeclined:
      'Sin problema. Tu árbol aparecerá como pendiente en la app cuando le toque la foto.',
    successNotifySettings: 'Ajustes de notificaciones',

    successOpenTree: 'Ver el árbol',
    successPlantAnother: 'Sembrar otro',
    successDone: 'Listo',
  },

  /** The growth log: a new cycle, and the variant that reports a tree dead. */
  growthLog: {
    update: 'Actualizar bitácora',
    updateShort: 'Actualizar',
    newEntryTitle: (cycle: number) => `Nueva entrada — ciclo ${cycle}`,
    ghostHint: 'Alinea con la foto anterior',
    ghostBadge: 'FANTASMA',
    ghostToggleOn: 'Mostrar la foto anterior superpuesta',
    ghostToggleOff: 'Ocultar la foto anterior superpuesta',
    ghostUnavailable: 'La foto anterior no está disponible sin conexión.',

    healthLabel: 'Estado de salud',
    health: {
      healthy: 'Sano',
      at_risk: 'Débil',
      sick: 'Con plagas',
      dead: 'Muerto',
    },
    notesLabel: 'Notas (opcional)',
    notesPlaceholder: 'Le salieron flores nuevas',
    captureLocation: (coordinates: string) => `Coordenada de captura: ${coordinates}`,
    captureLocationMissing: 'Sin coordenada de captura',
    save: 'Guardar entrada',
    saving: 'Guardando…',

    reportDead: 'Reportar árbol muerto',
    deadWarning:
      'El árbol quedará marcado como muerto en el mapa y dejarán de llegar recordatorios. Su bitácora se conserva completa.',
    deadPhotoTitle: 'Fotografía de evidencia',
    deadPhotoHint: 'Obligatoria · cámara en vivo',
    deadCauseLabel: 'Causa',
    deadCauses: ['Sequía', 'Ganado', 'Quema', 'Plaga', 'Otra'],
    deadStoryLabel: '¿Qué pasó? (opcional)',
    deadStoryPlaceholder: 'El verano fue muy fuerte y no…',
    deadNoMeasures: 'No se piden medidas. El coordinador validará el reporte.',
    deadSubmit: 'Reportar como muerto',
    deadCauseRequired: 'Elige la causa para poder reportarlo.',
    deadBack: 'Volver a la entrada normal',
    /**
     * What a death report writes into `notes`, which is the column
     * `log_entries_cause_when_dead` refuses to leave blank.
     *
     * The cause is stored as the label the guardian actually chose, in Spanish,
     * because that same string is read back in the log timeline and by the
     * coordinator validating the report. Whatever else was written follows it
     * after an em dash, so the cause is always the first thing on the line.
     */
    deadNotes: (cause: string, story: string | null) =>
      story === null ? cause : `${cause} — ${story}`,

    savedTitle: 'Bitácora actualizada',
    savedBody: (date: string) => `Próxima foto: ${date}.`,
    deadSavedTitle: 'Reporte enviado',
    deadSavedBody:
      'El árbol quedó marcado como muerto en el mapa y dejarán de llegar recordatorios. Su bitácora se conserva completa.',
    duplicateTitle: 'Ese ciclo ya estaba guardado',
    duplicateBody:
      'La entrada había llegado al servidor en un intento anterior. Terminamos de subir la fotografía y no se duplicó nada.',
  },

  /** Taking, compressing and sending a photograph. */
  photo: {
    take: 'Tomar fotografía',
    retake: 'Repetir la foto',
    shutter: 'Tomar la fotografía',
    preview: 'Fotografía tomada',
    /** Printed over the viewfinder, where the absence of a gallery button is
        otherwise read as a missing feature rather than as the rule it is. */
    liveOnly: 'CÁMARA EN VIVO · SIN GALERÍA',
    compressNote: 'Se comprime a ~200 KB antes de subir',
    preparing: 'Preparando la fotografía…',
    ready: (kilobytes: number) => `Lista · ${kilobytes} KB`,
    permissionTitle: 'La cámara está desactivada',
    permissionBody:
      'La fotografía es la evidencia del árbol, y por eso la pedimos desde la cámara. Actívala en los ajustes del teléfono para poder tomarla.',
    permissionAllow: 'Permitir la cámara',
    permissionSettings: 'Abrir ajustes del teléfono',
    required: 'Falta la fotografía.',
    tooHeavyTitle: 'La fotografía pesa demasiado',
    tooHeavyBody:
      'No pudimos reducirla por debajo del límite del almacenamiento. Toma otra con menos detalle e inténtalo de nuevo.',
    prepareFailedTitle: 'No pudimos preparar la fotografía',
    prepareFailedBody: 'Vuelve a tomarla. Los datos que ya escribiste se conservan.',

    uploadFailedTitle: 'No pudimos subir la fotografía',
    uploadFailedBody:
      'El registro ya quedó guardado en el servidor y la fotografía sigue en este teléfono, así que no se ha perdido nada. Revisa tu conexión y reintenta el envío.',
    uploadRetry: 'Reintentar el envío',
    uploading: 'Subiendo la fotografía…',
    uploadOffline: 'Sin conexión. Reintenta el envío cuando vuelva la señal.',
    uploadPending: 'Foto pendiente de enviar',
  },

  /** The "Mis árboles" tab. */
  myTrees: {
    tabLabel: 'Mis árboles',
    title: 'Mis árboles',
    // The summary is four pieces rather than one sentence because the canvas
    // tints only the pending fragment, and a tinted fragment has to be its own
    // text node.
    summaryCount: (total: number) => (total === 1 ? '1 árbol' : `${total} árboles`),
    summarySeparator: ' · ',
    summaryAllUpToDate: 'todos al día',
    summaryPending: (pending: number) => `${pending} por actualizar`,
    tabAll: (count: number) => `Todos (${count})`,
    tabPending: (count: number) => `Pendientes (${count})`,
    cardLabel: (species: string, state: string) => `Árbol de ${species}, ${state}`,
    cycle: (cycle: number) => `CICLO ${cycle}`,
    noCycle: 'SIN BITÁCORA',
    overdueBy: (days: number) =>
      days === 1 ? 'Foto pendiente desde hace 1 día' : `Foto pendiente desde hace ${days} días`,
    dueToday: 'La foto del ciclo vence hoy',
    dueIn: (date: string) => `Próxima foto: ${date}`,
    dead: 'Reportado como muerto',

    emptyTitle: 'Todavía no has sembrado ningún árbol',
    emptyBody: 'Tu primer árbol aparecerá aquí y en el mapa de todo el Huila.',
    emptyPending: 'No tienes ningún árbol esperando fotografía. Todos están al día.',
    loading: 'Cargando tus árboles…',
    errorTitle: 'No pudimos cargar tus árboles',
    errorBody: 'Revisa tu conexión. Tus datos guardados no se pierden.',
    offlineCached: 'Sin conexión. Estás viendo la última lista guardada.',
    signedOutTitle: 'Entra para ver tus árboles',
    signedOutBody: 'Los árboles que siembras quedan asociados a tu cuenta de Guardián.',
  },

  /**
   * The activity tab: what a tree is still waiting for, and what has already
   * been dealt with.
   *
   * The two sections date themselves differently on purpose, and the canvas
   * draws them that way. A pending item is measured against today, because the
   * question it answers is "how late am I"; a past one carries its calendar
   * date, because by then the distance from today has stopped meaning anything.
   */
  activity: {
    tabLabel: 'Actividad',
    title: 'Actividad',

    /**
     * Push delivery is not built yet: nothing in the app registers a device or
     * sends anything. The box says so rather than offering a switch that would
     * quietly do nothing, and points at the profile, which is where the
     * notification settings live.
     */
    notificationsOffTitle: 'Notificaciones desactivadas',
    notificationsOffBody:
      'Las notificaciones están desactivadas. Actívalas para no perder el ciclo de tus árboles.',
    notificationsOffAction: 'Activar',

    pendingSection: 'Pendientes',
    previousSection: 'Anteriores',

    /** The sentence a pending row makes: species, where it stands, which cycle. */
    pendingRow: (species: string, place: string, cycle: number) =>
      `Tu ${species} de ${place} espera su foto del ciclo ${cycle}`,
    /** The same sentence for a tree whose vereda nobody recorded. */
    pendingRowNoPlace: (species: string, cycle: number) =>
      `Tu ${species} espera su foto del ciclo ${cycle}`,
    pendingRowHint: 'Abre la bitácora para subir la fotografía',

    /** A cycle already closed. `on_time` is decided in the database, never here. */
    resolvedOnTime: (species: string, cycle: number) =>
      `${species} · ciclo ${cycle} resuelto a tiempo`,
    resolvedLate: (species: string, cycle: number) =>
      `${species} · ciclo ${cycle} resuelto con retraso`,

    // Relative dates, for the pending section only.
    daysAgo: (days: number) => (days === 1 ? 'hace 1 día' : `hace ${days} días`),
    today: 'hoy',
    inDays: (days: number) => (days === 1 ? 'mañana' : `en ${days} días`),

    loading: 'Cargando tu actividad…',
    errorTitle: 'No pudimos cargar tu actividad',
    errorBody: 'Revisa tu conexión. Tus datos guardados no se pierden.',
    /**
     * Only the closed cycles failed. Named apart from the whole-screen error so
     * the guardian is not told that everything is broken when the half that
     * matters, what they still owe, is on screen and up to date.
     */
    historyErrorTitle: 'No pudimos cargar tus ciclos cerrados',
    historyErrorBody: 'Lo que tienes pendiente sí está al día. Revisa tu conexión y reintenta.',
    offlineCached: 'Sin conexión. Estás viendo la última actividad guardada.',

    emptyPending: 'No tienes nada pendiente. Todos tus árboles están al día.',
    emptyPrevious: 'Todavía no has cerrado ningún ciclo.',
    emptyTitle: 'Aquí verás lo que te toca',
    emptyBody:
      'Cuando siembres tu primer árbol, sus recordatorios y sus ciclos cerrados aparecerán en esta lista.',

    signedOutTitle: 'Entra para ver tu actividad',
    signedOutBody: 'Los recordatorios de tus árboles quedan asociados a tu cuenta de Guardián.',
  },

  /** The tree detail: timeline, before and after, height curve and guardian. */
  treeDetail: {
    title: 'Detalle del árbol',
    coverLabel: (species: string) => `Fotografía más reciente del árbol de ${species}`,
    noCover: 'Todavía sin fotografía',
    header: (cycle: string, village: string, coordinates: string) =>
      `${cycle} · VEREDA ${village} · ${coordinates}`,

    compareHeading: 'ANTES / DESPUÉS',
    compareEmpty: 'Con dos entradas podrás comparar el antes y el después.',
    compareBefore: 'Antes',
    compareAfter: 'Después',
    compareSlider: 'Deslizador de comparación entre las dos fotografías',
    compareLess: 'Mostrar más de la fotografía anterior',
    compareMore: 'Mostrar más de la fotografía posterior',
    comparePickBefore: 'Entrada de la izquierda',
    comparePickAfter: 'Entrada de la derecha',

    heightHeading: 'ALTURA · CM',
    heightEmpty: 'La gráfica aparece con la segunda medida.',
    heightChartLabel: (points: number, first: number, last: number) =>
      `Gráfica de altura con ${points} medidas, de ${first} a ${last} centímetros`,

    logHeading: (count: number) =>
      count === 1 ? 'BITÁCORA · 1 ENTRADA' : `BITÁCORA · ${count} ENTRADAS`,
    logPlanting: 'Siembra · ciclo 1',
    logCycle: (cycle: number) => `Ciclo ${cycle}`,
    logOnTime: 'a tiempo',
    logLate: 'tarde',
    logMeasures: (date: string, height: number, branches: number | null) =>
      branches === null
        ? `${date} · ${height} cm`
        : `${date} · ${height} cm · ${branches === 1 ? '1 rama' : `${branches} ramas`}`,
    logNoMeasures: (date: string) => `${date} · sin medidas`,
    logOpenPhoto: (cycle: number) => `Ver la fotografía del ciclo ${cycle}`,
    logEmpty: 'Esta bitácora todavía no tiene entradas.',

    // The whole sentence, which is what a screen reader is given. The four
    // fragments below are the same sentence taken apart, because the canvas
    // gives the name and the seniority their own tints and a tinted fragment
    // has to be its own text node.
    guardianLine: (name: string, since: string) =>
      `Este árbol pertenece a ${name}, guardián desde ${since}.`,
    guardianLineLead: 'Este árbol pertenece a ',
    guardianLineJoin: ', ',
    guardianLineSince: (since: string) => `guardián desde ${since}`,
    guardianLineEnd: '.',
    guardianUnknown: 'Este árbol no tiene guardián asignado.',
    miniMapLabel: 'Ubicación del árbol en el mapa',

    viewerClose: 'Cerrar la fotografía',
    viewerCaption: (code: string, cycle: number) => `${code} · Ciclo ${cycle}`,
    // The foot of the viewer: the timeline's own line with the branch count
    // traded for the place the shutter fired. Both halves can be missing -- a
    // death report carries no height, and a photograph that reached the log
    // without an EXIF position carries no coordinate.
    viewerMeasures: (date: string, height: number | null, capture: string) =>
      height === null
        ? `${date} · sin medidas · ${capture}`
        : `${date} · ${height} cm · ${capture}`,
    viewerCapture: (coordinates: string) => `capturada ${coordinates}`,
    // The same words as `growthLog.captureLocationMissing`, lowercase because
    // here they are a fragment between middots and not a line of their own.
    viewerCaptureMissing: 'sin coordenada de captura',
    viewerPhotoLabel: (code: string, cycle: number) =>
      `Fotografía del ciclo ${cycle} del árbol ${code}`,
    viewerErrorTitle: 'No pudimos mostrar la fotografía',
    viewerErrorBody:
      'El enlace de la imagen pudo haber vencido. Vuelve a intentarlo cuando tengas señal.',

    loading: 'Cargando el árbol…',
    errorTitle: 'No pudimos cargar este árbol',
    errorBody: 'Revisa tu conexión y vuelve a intentarlo.',
    notFoundTitle: 'Este árbol ya no está disponible',
    notFoundBody: 'Puede que la coordinación del PRAE lo haya archivado.',
  },

  legal: {
    title: 'Privacidad y términos',
    version: 'Versión del 21 ago 2026',
    provisionalNotice:
      'Este contenido es un borrador de trabajo. El texto legal definitivo se publica antes de que la aplicación salga a las tiendas y reemplazará por completo lo que aparece aquí.',
    sections: [
      {
        heading: 'Quién trata tus datos',
        body: 'ÁrbolApp Huila es una plataforma del PRAE "De la pantalla a la realidad" de la I.E. San Sebastián, en La Plata, Huila. La titularidad definitiva de la plataforma queda por definir y se publicará en la versión final de este documento.',
      },
      {
        heading: 'Qué datos recogemos',
        body: 'Tu nombre completo, tu correo electrónico y, si la indicas, tu institución u organización. De los árboles que registres guardamos su ubicación exacta, la especie que escribas, las fotografías que subas y las medidas que reportes.',
      },
      {
        heading: 'Para qué los usamos',
        body: 'Para mostrar los árboles en el mapa, avisarte cuando toca actualizar la bitácora y construir los informes ambientales del proyecto. El correo se usa para escribirte sobre tus árboles; nunca se muestra en el mapa ni en ninguna pantalla pública.',
      },
      {
        heading: 'Solo mayores de edad',
        body: 'La plataforma admite únicamente personas mayores de 18 años. Al registrarte declaras expresamente que lo eres. Si detectamos una cuenta de una persona menor de edad, se archiva.',
      },
      {
        heading: 'Tus derechos',
        body: 'Puedes conocer, actualizar y rectificar tus datos desde tu perfil, y solicitar su supresión conforme a la Ley 1581 de 2012. Los registros de árboles no se borran: se archivan, conservando el histórico ambiental del proyecto sin exponerlos públicamente.',
      },
      {
        heading: 'Fotografías y ubicación',
        body: 'Las fotografías de la bitácora y las coordenadas de los árboles son públicas dentro del mapa del proyecto, porque el sentido del proyecto es que la siembra se pueda verificar. No publicamos tu correo junto a ellas.',
      },
    ],
    contactHeading: 'Dudas',
    contactBody:
      'Mientras se publica el texto definitivo, cualquier consulta sobre el tratamiento de datos se atiende a través de la coordinación del PRAE de la I.E. San Sebastián.',
  },

  validation: {
    fullNameRequired: 'Escribe tu nombre completo.',
    fullNameTooShort: 'El nombre debe tener al menos 3 caracteres.',
    fullNameTooLong: 'El nombre no puede pasar de 120 caracteres.',
    institutionTooLong: 'El nombre de la institución no puede pasar de 120 caracteres.',
    emailRequired: 'Escribe tu correo.',
    emailInvalid: 'Escribe un correo válido, como nombre@correo.com.',
    passwordRequired: 'Escribe tu contraseña.',
    passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
    passwordTooLong: 'La contraseña no puede pasar de 72 caracteres.',
    passwordMismatch: 'Las contraseñas no coinciden.',
    adultRequired: 'Debes declarar que eres mayor de edad para crear una cuenta de Guardián.',
    termsRequired: 'Debes aceptar la política de privacidad y los términos.',
  },

  /**
   * One message per failure the authentication layer knows how to name, each
   * one saying what to do next. A generic "ocurrió un error" leaves a guardian
   * with no way to tell a typo from a radio that dropped.
   */
  authErrors: {
    offline: 'No hay conexión. Conéctate a datos o wifi e inténtalo de nuevo.',
    network: 'No pudimos comunicarnos con el servidor. Revisa tu conexión y reintenta.',
    emailTaken: 'Ya existe una cuenta con este correo. Puedes entrar o recuperar tu contraseña.',
    weakPassword:
      'Esa contraseña es demasiado débil. Usa al menos 8 caracteres y combina letras y números.',
    invalidCredentials: 'Correo o contraseña incorrectos. Revisa e intenta de nuevo.',
    emailNotConfirmed:
      'Todavía no has confirmado tu correo. Abre el mensaje que te enviamos o pide uno nuevo.',
    emailRateLimited:
      'Se alcanzó el límite de correos por hora del servicio. Espera una hora antes de pedir otro, o pide a la coordinación del PRAE que registre a los guardianes en grupos pequeños.',
    tooManyRequests: 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.',
    sessionExpired: 'Tu sesión venció. Vuelve a iniciar sesión.',
    linkExpired: 'Ese enlace venció o ya se usó. Pide uno nuevo.',
    samePassword: 'La contraseña nueva es igual a la anterior. Elige una distinta.',
    invalidEmail: 'Escribe un correo válido, como nombre@correo.com.',
    signUpDisabled:
      'El registro de guardianes está cerrado en este momento. Escribe a la coordinación del PRAE.',
    unknown: 'No pudimos completar la acción. Inténtalo de nuevo en un momento.',
  },

  a11y: {
    passwordVisibility: 'Alternar la visibilidad de la contraseña',
    closeNotice: 'Descartar el aviso',
    onboardingProgress: (current: number, total: number) =>
      `Progreso del recorrido: paso ${current} de ${total}`,
    /** Announced with the state name, so a state is never told by hue alone. */
    treeState: (state: string) => `Estado: ${state}`,
    photoPreview: 'Vista previa de la fotografía tomada',
  },

  /**
   * One message per failure the tree calls know how to name. A generic "ocurrió
   * un error" after a guardian has walked to a tree and filled in a form is the
   * kind of dead end that makes somebody stop using the app.
   */
  treeErrors: {
    /** Heading over whichever of the messages below applies. */
    title: 'No pudimos guardar',
    offline: 'No hay conexión. Conéctate a datos o wifi e inténtalo de nuevo.',
    network: 'No pudimos comunicarnos con el servidor. Revisa tu conexión y reintenta.',
    notSignedIn: 'Tu sesión venció. Entra de nuevo; lo que llevas queda guardado en el teléfono.',
    notOwner: 'Este árbol es de otro guardián, así que no puedes escribir en su bitácora.',
    zoneUnknown: 'Esa vereda ya no está en el catálogo. Elige otra.',
    speciesBlank: 'Escribe la especie que sembraste.',
    codeExhausted: 'Se agotaron los códigos de este municipio. Avisa a la coordinación del PRAE.',
    duplicateCycle: 'Ese ciclo ya estaba guardado.',
    unknown: 'No pudimos completar el registro. Inténtalo de nuevo en un momento.',
  },
} as const;
