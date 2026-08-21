/**
 * Every string the guardian reads, grouped by screen. Copy never lives inside
 * a component: keeping it here is what makes a wording review possible without
 * touching logic, and leaves the door open for translation later.
 *
 * Written in Spanish, addressing the reader as "tú" or impersonally. Never
 * voseo: the project is in Huila, where nobody says "ingresá".
 */
export const texts = {
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
    exploreAsGuest: 'Explorar el mapa sin cuenta',
    alreadyHaveAccount: 'Ya tengo cuenta',
    stepLabel: (current: number, total: number) => `Paso ${current} de ${total}`,
    steps: [
      {
        title: 'Siembra un árbol y ponlo en el mapa',
        body: 'Cada árbol que siembras queda ubicado en el mapa de La Plata y se convierte en un punto de luz que cualquiera puede ver.',
      },
      {
        title: 'Cada dos meses, una foto y sus medidas',
        body: 'Este proyecto nace del PRAE de la I.E. San Sebastián y de Juventud en línea. Tu bitácora es la evidencia que sostiene el informe ambiental del colegio.',
      },
      {
        title: 'El Huila ve crecer el bosque',
        body: 'Ser Guardián es cuidar tus árboles y contar su historia. Con esas fotos se sabe cuántos siguen vivos y cuánto han crecido.',
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
    passwordConfirmationLabel: 'Repite la contraseña',
    adultLabel: 'Declaro que soy mayor de 18 años',
    termsLabel: 'Acepto la política de privacidad y los términos de uso',
    termsLink: 'Leer la política de privacidad y los términos',
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
    exploreAsGuest: 'Explorar el mapa sin cuenta',
    sessionExpired: 'Tu sesión se cerró por seguridad. Vuelve a entrar para continuar.',
    passwordUpdated: 'Contraseña actualizada. Entra con la nueva.',
  },

  verifyEmail: {
    title: 'Revisa tu correo',
    body: (email: string) =>
      `Enviamos un enlace de verificación a ${email}. Ábrelo desde este teléfono.`,
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
    title: 'Recuperar la contraseña',
    subtitle: 'Escribe el correo con el que te registraste.',
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
    passwordConfirmationLabel: 'Repite la contraseña nueva',
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
    memberSince: (date: string) => `Guardián desde ${date}`,
    emailLabel: 'Correo electrónico',
    emailHint:
      'El correo no se puede cambiar por ahora. Escribe a la coordinación si lo necesitas.',
    fullNameLabel: 'Nombre completo',
    institutionLabel: 'Institución u organización',
    institutionPlaceholder: 'Sin institución',
    adultConfirmed: 'Mayoría de edad declarada',
    termsAcceptedAt: (date: string) => `Términos aceptados el ${date}`,
    saved: 'Tus datos quedaron guardados.',
    notificationsTitle: 'Notificaciones',
    notificationsHint:
      'Los recordatorios llegan cada dos meses, cuando toca fotografiar un árbol. El envío se activa más adelante.',
    notificationsComingSoon: 'Disponible próximamente',
    remindersLabel: 'Recordatorios de actualización',
    summaryLabel: 'Resumen mensual de mis árboles',
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

  account: {
    title: 'Tu cuenta',
    body: 'Estás explorando el mapa sin cuenta. Regístrate como Guardián para sembrar árboles y llevar su bitácora.',
    signUp: 'Crear cuenta de Guardián',
    signIn: 'Ya tengo cuenta',
    legalLink: 'Política de privacidad y términos',
  },

  map: {
    tabLabel: 'Mapa',
    accountTabLabel: 'Cuenta',
    profileTabLabel: 'Perfil',
    placeholderTitle: 'El mapa llega en la próxima entrega',
    placeholderBody:
      'Aquí verás cada árbol sembrado como un punto de luz, con su especie, su guardián y su última fotografía.',
    guestNotice: 'Estás explorando sin cuenta. Puedes mirar el mapa, pero no registrar árboles.',
    guestAction: 'Crear cuenta de Guardián',
  },

  legal: {
    title: 'Privacidad y términos',
    provisionalBadge: 'Borrador — texto provisional',
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
  },
} as const;
