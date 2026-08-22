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
    forgotPassword: '¿Olvidaste tu contraseña?',
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
    filterMunicipality: 'Municipio: todos',
    metrics: {
      planted: 'SEMBRADOS',
      alive: 'VIVOS',
      survival: 'TASA DE SUPERVIVENCIA',
      punctuality: 'PUNTUALIDAD',
    },
    byVillage: 'POR VEREDA',
    bySpecies: 'POR ESPECIE',
    allSpecies: (count: number) => `Ver las ${count} especies`,
  },

  /** D3 · Gestión de usuarios. */
  users: {
    title: 'Usuarios',
    countSuffix: (count: number) => (count === 1 ? '· 1 guardián' : `· ${count} guardianes`),
    searchPlaceholder: 'Buscar por nombre o correo…',
    columns: {
      guardian: 'GUARDIÁN',
      role: 'ROL',
      trees: 'ÁRBOLES',
      upToDate: 'AL DÍA',
      status: 'ESTADO',
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
    reassignNotice:
      'El guardián nuevo recibirá el árbol con su bitácora completa y el ciclo se reinicia desde hoy.',
    reassignTo: (name: string) => `Reasignar a ${name}`,
    reassigning: 'Reasignando…',
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
  },
} as const;
