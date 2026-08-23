/**
 * Every string the coordinator reads in the panel, grouped by screen. Copy
 * never lives inside a component: keeping it here is what makes a wording
 * review possible without touching logic, and leaves the door open for
 * translation later.
 *
 * Written in Spanish, addressing the reader as "tú" or impersonally. Never
 * voseo: the project is in Huila, where nobody says "ingresá".
 *
 * The mobile app has its own copy of this file. The two are not shared on
 * purpose -- the panel speaks to a coordinator and the app to a guardian, and
 * the same idea is worded differently for each. What must not diverge is the
 * name of a tree state, so those come from `treeStateLabels` below, which
 * mirrors the mobile list word for word.
 */

/**
 * What each tracking state is called. The same five words the guardian sees on
 * their phone: a tree that reads "Vencido" in the app and "Atrasado" in the
 * panel looks like two different states to the coordinator phoning about it.
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

  /** E1 · Mapa público con ficha del árbol. E3 · La variante empotrable. */
  publicMap: {
    title: 'Mapa de árboles del PRAE Huila',
    subtitle: 'Ubicación de los árboles sembrados',
    legend: 'Leyenda de estados',
    legendTitle: 'Estados de seguimiento',
    filters: 'Filtros',
    filtersActive: 'Filtros activos',
    clearFilters: 'Limpiar filtros',
    filterSpecies: 'Filtrar por especie',
    filterZone: 'Filtrar por zona',
    /** Said where the canvas draws a control the query behind it does not have. */
    filterSpeciesPending: 'Las especies se cargarán desde la base de datos.',
    filterZonePending: 'Las zonas se cargarán desde la base de datos.',
    noFiltersApplied: 'Mostrando todos los árboles',
    loading: 'Cargando árboles…',
    loadingMap: 'Cargando mapa…',
    emptyMap: 'No hay árboles en esta zona',
    treesError: 'No se pudieron cargar los árboles',
    unknownError: 'No se pudo completar la consulta. Inténtalo de nuevo.',
    mapError: 'No se pudo cargar el mapa',
    mapErrorDetail: 'Revisa tu conexión e inténtalo de nuevo.',
    mapKeyMissing: 'Clave de Google Maps no configurada',
    mapKeyMissingDetail:
      'El mapa público no se puede mostrar sin una clave válida. Los filtros y la información del árbol están listos para usarse.',
    retry: 'Reintentar',
    retryMap: 'Reintentar cargar el mapa',
    /**
     * Read out by assistive technology on the regions the map replaces itself
     * with. A region announced only as "mapa" while it is showing a failure is
     * the silent failure this project forbids.
     */
    regionUnavailable: 'Mapa no disponible',
    regionError: 'Error al cargar el mapa',
    regionLoading: 'Cargando el mapa',
    /**
     * The marker's tooltip and its accessible name. The state travels with the
     * species on purpose: on the map the colour of the pin is the only other
     * place it is said, and colour alone is not a channel.
     */
    markerLabel: (species: string, state: string) => `${species} · ${state}`,
    /** E3 · The <head> of the embeddable page. */
    embedTitle: 'Mapa de árboles · ÁrbolApp Huila',
    embedDescription: 'Mapa interactivo de los árboles sembrados por el PRAE del Huila.',
    treeCard: {
      title: 'Detalle del árbol',
      code: 'Código',
      species: 'Especie',
      speciesOriginal: 'Como fue registrada',
      status: 'Estado',
      planted: 'Fecha de siembra',
      lastUpdated: 'Última actualización',
      location: 'Ubicación',
      village: 'Vereda',
      municipality: 'Municipio',
      coordinates: 'Coordenadas',
      guardian: 'Guardián responsable',
      cycle: 'Ciclo',
      noCycle: 'Sin registros',
      noGuardian: 'Sin asignar',
      noPhoto: 'Sin fotografía',
      photoAlt: (code: string) => `Fotografía del árbol ${code}`,
      loadFailed: 'No se pudo cargar la información del árbol.',
      close: 'Cerrar',
    },
    states: {
      up_to_date: 'Al día',
      due_soon: 'Por actualizar',
      overdue: 'Vencido',
      dead: 'Muerto',
      archived: 'Archivado',
    },
  },

  common: {
    appName: 'ÁrbolApp Huila',
    panelName: 'Panel de coordinación',
    cancel: 'Cancelar',
    retry: 'Reintentar',
    close: 'Cerrar',
    save: 'Guardar cambios',
    saving: 'Guardando…',
    loading: 'Cargando…',
    search: 'Buscar',
    /** Shown wherever a figure has no value yet, so a gap never reads as zero. */
    noValue: '—',
  },

  /** Copy belonging to the interface catalogue rather than to one screen. */
  ui: {
    selectPlaceholder: 'Selecciona…',
    dialogClose: 'Cerrar el diálogo',
    clearSearch: 'Borrar la búsqueda',
  },

  /**
   * The failure and emptiness states. Network errors are always visible and
   * always offer a retry: a coordinator who cannot tell a slow query from a
   * broken one starts doubting the figures, and the figures are the product.
   */
  states: {
    loadFailedTitle: 'No se pudieron cargar los datos',
    loadFailedBody: 'Revisa tu conexión e inténtalo de nuevo.',
    emptyTitle: 'Todavía no hay nada aquí',
    /**
     * Said on a screen whose data source does not exist yet, so a placeholder
     * is never mistaken for a real zero.
     */
    notAvailableYet: 'Este dato aún no está disponible.',
  },

  /** Missing configuration, shown instead of a stack trace. */
  config: {
    title: 'Falta configurar el panel',
    body: 'El panel no puede conectarse a Supabase porque faltan variables de entorno. Copia el archivo .env.example a .env.local y completa los valores.',
    missingLabel: 'Variables que faltan:',
  },

  /** D1 · Acceso del coordinador. */
  signIn: {
    eyebrow: 'PRAE «DE LA PANTALLA A LA REALIDAD»',
    heroTitle: 'El bosque del Huila, en datos',
    title: 'Panel de coordinación',
    subtitle: 'Acceso restringido al rol de coordinador del PRAE.',
    emailLabel: 'Correo',
    emailPlaceholder: 'coordinacion@iesansebastian.edu.co',
    passwordLabel: 'Contraseña',
    submit: 'Entrar al panel',
    submitting: 'Entrando…',
    /**
     * Deliberately not a link. There is no web recovery flow yet, and the
     * recovery email the mobile app sends returns to `arbolapp://reset-password`,
     * a deep link that only resolves on a phone with the app installed -- so
     * pointing the coordinator there would strand anyone who does not have it.
     * Until `/forgot-password` exists, the honest route is a person.
     */
    forgotPassword:
      '¿Olvidaste tu contraseña? Escribe a la coordinación del PRAE para que la restablezcan.',
    /** Why the gate sent them back, one line per reason. */
    denied: {
      'no-session': 'Tu sesión terminó. Vuelve a entrar para continuar.',
      'not-coordinator':
        'Esta cuenta es de guardián. El panel es solo para el rol de coordinador; usa la aplicación móvil para ver tus árboles.',
      'no-profile':
        'Tu cuenta no tiene un perfil asociado. Escribe a la coordinación del PRAE para que la revisen.',
    },
    errors: {
      invalidCredentials: 'El correo o la contraseña no coinciden.',
      emailNotConfirmed: 'Confirma tu correo antes de entrar. Revisa tu bandeja de entrada.',
      rateLimited: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      network: 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.',
      unknown: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
      emailRequired: 'Escribe tu correo.',
      emailInvalid: 'Ese correo no parece válido.',
      passwordRequired: 'Escribe tu contraseña.',
    },
  },

  /** The sidebar shared by D2 to D7. */
  nav: {
    kicker: 'PANEL DE COORDINACIÓN',
    dashboard: 'Tablero',
    users: 'Usuarios',
    moderation: 'Moderación',
    species: 'Especies',
    export: 'Exportar',
    coordinatorRole: 'Coordinador PRAE',
    signOut: 'Cerrar sesión',
    /** Read out by screen readers on the count beside "Moderación". */
    moderationBadge: (count: number) =>
      count === 1 ? '1 árbol marcado para revisar' : `${count} árboles marcados para revisar`,
  },

  /** D2 · Tablero de estadísticas. */
  dashboard: {
    title: 'Tablero',
    /** Read out by the filter, whose visible text is the chosen option. */
    municipalityLabel: 'Municipio',
    allMunicipalities: 'Todos los municipios',
    metrics: {
      planted: 'SEMBRADOS',
      alive: 'VIVOS',
      survival: 'TASA DE SUPERVIVENCIA',
      punctuality: 'PUNTUALIDAD',
    },
    /** Under VIVOS. The archived are not counted: they leave the statistics. */
    deadCount: (count: number) => (count === 1 ? '1 muerto' : `${count} muertos`),
    /** Under la tasa: says what the percentage is a percentage of. */
    survivalBase: (count: number) =>
      count === 1 ? 'sobre 1 árbol sembrado' : `sobre ${count} árboles sembrados`,
    /** Under PUNTUALIDAD, the figure that explains the one above it. */
    overdueCount: (count: number) =>
      count === 1 ? '1 bitácora vencida' : `${count} bitácoras vencidas`,
    byVillage: 'POR VEREDA',
    byVillageIn: (municipality: string) => `POR VEREDA · ${municipality.toUpperCase()}`,
    /** The bar that gathers every village outside the four largest. */
    otherVillages: 'Otras',
    /** A tree whose zone has no village level recorded. */
    unknownVillage: 'Sin vereda',
    villageEmpty: 'Todavía no hay árboles sembrados en este municipio.',
    bySpecies: 'POR ESPECIE',
    speciesEmpty: 'Todavía no hay especies registradas.',
    /**
     * Shown only while a municipality is chosen. The per species aggregate has
     * no municipality column, so the list keeps counting the whole project and
     * has to say it instead of looking filtered.
     */
    speciesWholeProject: 'Conteo de todo el proyecto: por especie no hay desglose por municipio.',
    allSpecies: (count: number) =>
      count === 1 ? 'Ver la única especie' : `Ver las ${count} especies`,
  },

  /** D3 · Gestión de usuarios. */
  users: {
    title: 'Usuarios',
    countSuffix: (count: number) => (count === 1 ? '· 1 guardián' : `· ${count} guardianes`),
    searchPlaceholder: 'Buscar por nombre o correo…',
    /** Named for assistive technology: the canvas shows only a placeholder. */
    searchLabel: 'Buscar un usuario por nombre o correo',
    columns: {
      guardian: 'GUARDIÁN',
      role: 'ROL',
      trees: 'ÁRBOLES',
      upToDate: 'AL DÍA',
      status: 'ESTADO',
      actions: 'ACCIONES',
    },
    /**
     * The two roles the database actually stores. The canvas writes "Egresada",
     * "Docente" and "Representante" in this column, and none of those is a
     * value the schema can hold.
     */
    roles: {
      guardian: 'Guardián',
      coordinator: 'Coordinador',
    },
    /**
     * The reason the panel is the only surface with an email. Shown under the
     * table so nobody has to remember why it may be here and nowhere else.
     */
    emailNotice:
      'El correo del guardián solo es visible aquí, en el panel. Nunca aparece en vistas públicas.',
    statusActive: 'Activo',
    statusArchived: 'Desactivado',
    overdueCount: (count: number) => (count === 1 ? '1 vencido' : `${count} vencidos`),
    view: 'Ver',
    deactivate: 'Desactivar',
    activate: 'Activar',
    /** Said when the tree columns could not be aggregated but the list loaded. */
    treeCountsUnavailable:
      'No se pudieron contar los árboles de cada usuario. Los nombres y correos sí están al día.',
    noResultsTitle: 'Ningún usuario coincide',
    noResultsBody: 'Prueba con otra parte del nombre o del correo.',
    emptyTitle: 'Todavía no hay usuarios registrados',
    /** The deactivation dialog, which follows the same rule as archiving a tree. */
    deactivateTitle: (name: string) => `Desactivar a ${name}`,
    deactivateBody:
      'La cuenta dejará de aparecer en las vistas públicas y de recibir recordatorios. Sus árboles y su bitácora se conservan y pueden reasignarse.',
    deactivateBodyEmphasis: 'Nada se borra.',
    deactivateReasonLabel: 'Motivo (obligatorio, queda en el registro)',
    deactivateReasonPlaceholder: 'Explica por qué se desactiva esta cuenta.',
    deactivateConfirm: 'Desactivar cuenta',
    deactivating: 'Desactivando…',
    activateTitle: (name: string) => `Reactivar a ${name}`,
    activateBody:
      'La cuenta vuelve a aparecer en las vistas públicas y a recibir recordatorios por sus árboles.',
    activateConfirm: 'Reactivar cuenta',
    activating: 'Reactivando…',
    reasonRequired: 'El motivo es obligatorio: tiene que quedar por qué se desactivó la cuenta.',
    reasonTooShort: 'Escribe un motivo que otra persona pueda entender más adelante.',
    /** Screen reader name for the action controls, which repeat on every row. */
    rowActionLabel: (action: string, name: string) => `${action} a ${name}`,
    /** Marks the coordinator's own row, which has no action beside it. */
    yourAccount: 'Tu cuenta',
    errors: {
      notAllowed: 'Tu cuenta no tiene permiso para cambiar el estado de un usuario.',
      cannotDeactivateSelf:
        'No puedes desactivar tu propia cuenta: te quedarías sin acceso al panel.',
      unknown: 'No se pudo guardar el cambio. Inténtalo de nuevo.',
    },
  },

  /** D4 · Moderación con archivado motivado. */
  moderation: {
    title: 'Moderación',
    flaggedSuffix: (count: number) => (count === 1 ? '· 1 marcado' : `· ${count} marcados`),
    archiveTitle: (treeName: string) => `Archivar «${treeName}»`,
    /**
     * The sentence that carries the domain rule onto the screen. Nothing in
     * this project is ever deleted, and the coordinator has to be able to read
     * that before they confirm.
     */
    archiveBody:
      'El árbol saldrá del mapa activo y dejará de generar recordatorios. Su bitácora se conserva y puede reasignarse después.',
    archiveBodyEmphasis: 'Nada se borra.',
    reasonLabel: 'Motivo (obligatorio, visible para el guardián)',
    reasonPlaceholder: 'Explica por qué se archiva. El guardián leerá este texto.',
    reasonRequired: 'El motivo es obligatorio: el guardián tiene derecho a saber por qué.',
    reasonTooShort: 'Escribe un motivo que el guardián pueda entender.',
    confirm: 'Archivar árbol',
    archiving: 'Archivando…',
    /**
     * Says out loud which signal the panel can really detect, so nobody reads
     * an empty grid as "no hay nada que revisar".
     */
    intro:
      'Aquí aparecen los árboles con la bitácora vencida, que es la única señal que la plataforma sabe detectar hoy. La comparación de coordenadas contra la foto y la detección de duplicados todavía no existen.',
    /** The line under each card, naming why the tree is on this screen. */
    reasonOverdue: (months: number) =>
      months <= 1 ? 'sin bitácora hace 1 mes' : `sin bitácora hace ${months} meses`,
    guardianLine: (name: string) => `Guardián: ${name}`,
    noGuardian: 'Sin guardián asignado',
    archiveAction: 'Archivar',
    viewAction: 'Ver el árbol',
    /** Said when the grid is showing only the head of a longer list. */
    showingOldest: (shown: number, total: number) =>
      `Se muestran los ${shown} árboles con la bitácora más atrasada, de ${total} en total.`,
    /** The photo is not loaded here; the bucket is private and needs a signed URL. */
    photoPlaceholderLabel: 'Sin fotografía cargada en esta vista',
    emptyTitle: 'Ninguna bitácora está vencida',
    emptyBody: 'Todos los árboles activos están dentro de su plazo de actualización.',
    /** The canvas draws a moderation history; there is no table behind it. */
    historyNote: 'historial de moderación',
    errors: {
      notAllowed: 'Tu cuenta no tiene permiso para archivar un árbol.',
      unknown: 'No se pudo archivar el árbol. Inténtalo de nuevo.',
    },
  },

  /** D5 · Fusión de especies. */
  species: {
    title: 'Especies',
    countSuffix: (count: number) => (count === 1 ? '· 1 clave' : `· ${count} claves`),
    intro:
      'Selecciona las variantes que son la misma especie y elige el nombre oficial. La fusión reetiqueta los árboles y queda registrada — se puede revertir.',
    treeCount: (count: number) => (count === 1 ? '1 árbol' : `${count} árboles`),
    mergeHeader: (variants: number, trees: number) =>
      `FUSIONAR ${variants} VARIANTES · ${trees} ÁRBOLES`,
    chooseOfficial: '¿Cuál nombre queda como oficial?',
    /**
     * The promise the merge must not break: the free text each guardian typed
     * is kept exactly as they wrote it, and only the counting name changes.
     */
    rawTextNotice:
      'Cada árbol conserva el texto original que escribió su guardián. La fusión solo cambia el nombre oficial con el que se cuenta.',
    mergeInto: (name: string) => `Fusionar en «${name}»`,
    merging: 'Fusionando…',
    singleOccurrenceTitle: 'Especies con una sola ocurrencia:',
    singleOccurrenceHint: 'probables errores de digitación.',
    undo: 'Revertir la fusión',
    /** Names the checkbox list for a screen reader; the canvas shows no title. */
    variantsLegend: 'Variantes de especie registradas',
    variantsEmpty: 'Todavía no hay especies registradas.',
    selectHint: 'Marca dos o más variantes para poder fusionarlas.',
    /**
     * The merge function accepts a surviving name that is none of the merged
     * ones -- "cinco mandarinos y seis mandarinas pueden acabar como once
     * árboles llamados «Árboles de mandarina»". The canvas only draws the
     * existing names, so the free-text option is one extra radio.
     */
    customNameOption: 'Otro nombre',
    customNameLabel: 'Nombre oficial nuevo',
    customNamePlaceholder: 'Ej.: Árboles de mandarina',
    customNameHint: 'El nombre oficial no tiene que ser ninguno de los que fusionas.',
    merged: (variants: number, name: string) =>
      variants === 1
        ? `Se fusionó 1 variante en «${name}».`
        : `Se fusionaron ${variants} variantes en «${name}».`,
    reverting: 'Revirtiendo…',
    reverted: 'La fusión se revirtió: cada variante recuperó su nombre y sus árboles.',
    errors: {
      selectTwo: 'Marca al menos dos variantes para fusionarlas.',
      customNameRequired: 'Escribe el nombre oficial nuevo.',
      notCoordinator: 'Solo el rol de coordinador puede fusionar especies.',
      merge: 'No se pudo completar la fusión. Inténtalo de nuevo.',
      revert: 'No se pudo revertir la fusión. Inténtalo de nuevo.',
    },
  },

  /** D6 · Detalle de árbol (admin) y reasignación. */
  treeDetail: {
    noGuardian: 'Sin guardián',
    dataHeader: 'DATOS',
    plantedAt: 'Siembra',
    location: 'Ubicación',
    village: 'Vereda',
    logbook: 'Bitácora',
    logbookEntries: (count: number, lastDate: string) =>
      count === 1 ? `1 entrada · última ${lastDate}` : `${count} entradas · última ${lastDate}`,
    miniMap: 'MINI-MAPA',
    moderationHistory: 'HISTORIAL DE MODERACIÓN',
    reassignHeader: 'REASIGNAR GUARDIÁN',
    reassignSearch: 'Buscar guardián activo…',
    /**
     * The canvas promises "el ciclo se reinicia desde hoy". Restarting it would
     * mean writing `trees.last_updated_at`, which the schema documents as the
     * capture time of the newest log entry -- moving it would invent a
     * measurement that never happened and inflate the punctuality rate. So the
     * reassignment moves the guardian and nothing else, and the sentence says
     * what actually happens.
     */
    reassignNotice:
      'El guardián nuevo recibirá el árbol con su bitácora completa. Los recordatorios siguen contando desde la última entrada registrada.',
    reassignTo: (name: string) => `Reasignar a ${name}`,
    reassigning: 'Reasignando…',
    guardian: 'Guardián',
    back: 'Volver a Moderación',
    /** Said when `tree_card` returns nothing: no such tree, or it is archived. */
    notFoundTitle: 'No se encontró el árbol',
    notFoundBody:
      'El identificador no corresponde a ningún árbol activo. Un árbol archivado tampoco aparece aquí.',
    noGuardianNotice:
      'Este árbol no tiene guardián asignado y no genera recordatorios hasta que se le asigne uno.',
    guardianDeactivatedNotice: (name: string, date: string) =>
      `${name}, su guardián, fue desactivado el ${date}. El árbol no genera recordatorios hasta tener guardián nuevo.`,
    guardianDeactivatedReason: (reason: string) => `Motivo: ${reason}`,
    logbookEmpty: 'Sin entradas',
    /** Why the mini map is a placeholder and not a map. */
    miniMapNote: 'El mapa web llega en una fase posterior.',
    /**
     * There is no moderation history table, and there is no record of when a
     * guardian was deactivated beyond `users.archived_at`. Saying so beats
     * showing two invented lines.
     */
    moderationHistoryNote: 'No existe un registro de moderación por árbol.',
    candidateTrees: (count: number) => (count === 1 ? '1 árbol' : `${count} árboles`),
    candidateAllUpToDate: 'todos al día',
    candidatePending: (count: number) => (count === 1 ? '1 pendiente' : `${count} pendientes`),
    candidatesEmpty: 'Ningún guardián activo coincide con la búsqueda.',
    reassigned: (name: string) => `El árbol quedó a cargo de ${name}.`,
    errors: {
      reassign: 'No se pudo reasignar el árbol. Inténtalo de nuevo.',
      notCoordinator: 'Solo el rol de coordinador puede reasignar un árbol.',
    },
  },

  /** D7 · Exportación de reportes PRAE. */
  export: {
    title: 'Exportar reportes',
    /**
     * States the rule the exports obey, on the screen where somebody could
     * otherwise assume the opposite.
     */
    intro:
      'Datos para el seguimiento del PRAE ante la Secretaría de Ambiente. Toda exportación excluye los correos de los guardianes.',
    inventoryTitle: 'Inventario de árboles',
    inventoryBody: 'Todos los árboles con especie, estado, vereda, coordenadas y guardián.',
    logbookTitle: 'Bitácoras por vereda',
    logbookBody: 'Entradas con medidas, puntualidad y estado de salud, agrupadas por vereda.',
    indicatorsTitle: 'Indicadores del PRAE',
    indicatorsBody:
      'Sembrados, vivos, supervivencia y puntualidad por municipio, vereda y especie.',
    csv: 'CSV',
    excel: 'Excel',
    preparing: 'Preparando…',
    lastExport: (date: string, fileName: string, author: string) =>
      `Última exportación: ${date} · ${fileName} · ${author}`,
    /** Read out on the download link, which otherwise says only "CSV". */
    csvLabel: (report: string) => `Descargar ${report} en CSV`,
    /**
     * Excel needs a spreadsheet writer, which is a dependency nobody has
     * justified yet. The button stays visible because the canvas shows it, and
     * disabled with the reason underneath, because a button that looks alive
     * and does nothing is worse than one that explains itself.
     */
    excelUnavailable:
      'La descarga en Excel todavía no está disponible. El CSV abre en Excel y en LibreOffice.',
    /**
     * The coordinates come from the map function, which caps its answer at a
     * thousand trees. Below that ceiling the export is complete; the day it is
     * crossed the coordinator has to know why some cells are empty.
     */
    coordinateLimitNotice:
      'Las coordenadas del inventario se leen de la consulta del mapa, que devuelve como máximo 1000 árboles. Por encima de esa cifra las celdas de coordenadas quedan vacías, nunca con un valor aproximado.',
    /** No table records an export, so the canvas's last line cannot be filled. */
    lastExportUnavailable: 'Las exportaciones no quedan registradas todavía.',
  },
} as const;
