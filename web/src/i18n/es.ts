import type { Dictionary } from "./en";

// Typed as Dictionary rather than inferred, which is what makes a missing or
// misspelled key fail the build instead of silently falling back to English.
const es: Dictionary = {
  appName: "Eetr Journal",
  language: "Idioma",

  signIn: {
    title: "Eetr Journal",
    tagline: "Un lugar tranquilo para pensar en voz alta.",
    action: "Continuar con eetr",
  },

  signOut: "Cerrar sesión",
  settings: "Ajustes",
  close: "Cerrar",
  backToJournal: "Volver al diario",

  errors: {
    title: "Algo salió mal",
    body: "No pudimos mostrar la página. Volver a intentar suele alcanzar.",
    retry: "Reintentar",
    notFoundTitle: "Acá no hay nada",
    notFoundBody: "Esa página no existe, o se mudó.",
    home: "Ir al inicio",
    signIn: {
      retry: "Intentar de nuevo",
      reference: "Referencia",
      codes: {
        Configuration: {
          title: "El inicio de sesión no está bien configurado",
          body: "Esta es nuestra. Eetr Journal y auth.eetr.app no se están poniendo de acuerdo en algo, y reintentar no lo va a resolver. Lo tenemos que arreglar de este lado.",
        },
        AccessDenied: {
          title: "Se denegó el acceso",
          body: "auth.eetr.app rechazó el pedido. O se canceló el inicio de sesión, o esta cuenta todavía no tiene permiso para entrar a Eetr Journal.",
        },
        OAuthCallbackError: {
          title: "El inicio de sesión no se completó",
          body: "auth.eetr.app respondió, pero no pudimos terminar el intercambio. Suele ser pasajero, y empezar de nuevo normalmente funciona.",
        },
        OAuthAccountNotLinked: {
          title: "Ese correo ya está en uso",
          body: "Ya existe un perfil con esta dirección, creado con otra forma de iniciar sesión. Usá la que usaste para registrarte.",
        },
        AccountNotLinked: {
          title: "Ese correo ya está en uso",
          body: "Ya existe un perfil con esta dirección, creado con otra forma de iniciar sesión. Usá la que usaste para registrarte.",
        },
        Verification: {
          title: "Ese enlace venció",
          body: "Los enlaces de inicio de sesión sirven una sola vez, y por poco tiempo. Pedí uno nuevo y usalo enseguida.",
        },
        MissingCSRF: {
          title: "El pedido de inicio de sesión quedó viejo",
          body: "La página estuvo abierta demasiado tiempo, o tu navegador está bloqueando nuestras cookies. Recargá la página de inicio de sesión y empezá desde ahí.",
        },
        CredentialsSignin: {
          title: "No aceptamos esos datos",
          body: "El usuario o la contraseña no coinciden con nada que conozcamos.",
        },
        WebAuthnVerificationError: {
          title: "No aceptamos tu passkey",
          body: "Tu dispositivo no pudo probar quién sos. Probá de nuevo, o entrá de otra forma.",
        },
        Unknown: {
          title: "No pudimos iniciar tu sesión",
          body: "No nos dijeron por qué. Empezar de nuevo suele funcionar; si sigue pasando, la referencia de abajo es lo que hay que citar.",
        },
      },
    },
  },

  shell: {
    transcripts: "Charlas recientes",
    entries: "Diario",
    todayTitle: "Hoy",
    resizeToday: "Redimensionar la entrada de hoy",
  },

  entries: {
    empty: "Todavía no hay nada escrito. Seguí hablando y esto se va llenando.",
    opening: "Abriendo...",
    unreadable: "Esto no se pudo abrir con tu clave.",
    none: "Todavía no hay nada escrito.",
    open: "Abrir esta entrada",
    backToToday: "Volver a hoy",
  },

  chat: {
    title: "Chat",
    placeholder: "Preguntá sobre el día de hoy, o simplemente empezá a escribir...",
    send: "Enviar",
    stop: "Parar",
    thinking: "Pensando...",
    reasoning: "Pensándolo",
    working: "Buscando algo...",
    emptyTitle: "Todavía no hay nada",
    unavailableTitle: "Esta no cargó",
    unavailablePrompt:
      "Lo que se dijo antes no se está mostrando. Lo que mandes igual va a esta charla.",
    emptyPrompt: "Contá qué tipo de día fue, y seguimos desde ahí.",
    unreadable: "Esto no se pudo abrir con tu clave.",
    you: "Vos dijiste",
    journal: "El diario dijo",
    noConversations: "Todavía no hay charlas.",
    delete: "Olvidar esta charla",
    newChat: "Charla nueva",
    aborted: "Lo paraste. Lo de arriba es todo.",
    retry: "Probá de nuevo",
    errors: {
      empty: "No hay nada para enviar.",
      tooLong: "Eso es más largo de lo que puede ser un mensaje. Mandalo en dos.",
      locked: "Tu diario se bloqueó mientras escribías. Desbloqueálo y mandálo de nuevo.",
      unauthorized: "Cerraste sesión. Iniciá sesión y mandálo otra vez.",
      unreachable: "No se pudo llegar al diario, así que no se mandó nada.",
      failed: "Esa respuesta se cortó a la mitad. Lo de arriba es todo.",
    },
  },

  profile: {
    title: "Tu perfil",
    subtitle: "Cómo querés que el diario te trate, y cómo querés que se vea.",
    identity: "Identidad",
    name: "Nombre",
    email: "Correo electrónico",
    preferences: "Preferencias",
    pronouns: "Pronombres",
    pronounsHint: "Elegí uno o escribí el tuyo.",
    pronounOptions: ["ella", "él", "elle", "ella/elle", "él/elle"],
    sex: "Sexo",
    treatment: "Trato preferido",
    treatmentHint: "El género gramatical que el diario usa cuando te escribe.",
    locationLabel: "Ubicación",
    locationHint: "Una ciudad o región, para dar contexto y no para seguirte.",
    timezone: "Zona horaria",
    appearance: "Apariencia",
    theme: "Tema",
    save: "Guardar cambios",
    saving: "Guardando...",
    saved: "Guardado",
    unsaved: "Tenés cambios sin guardar",
    saveFailed: "No pudimos guardar los cambios. Probá de nuevo.",
  },

  values: {
    sex: {
      female: "Femenino",
      male: "Masculino",
      intersex: "Intersexual",
      undisclosed: "Prefiero no decirlo",
    },
    treatment: {
      female: "Femenino",
      male: "Masculino",
      neutral: "Neutro",
    },
    theme: {
      system: "Igual que mi sistema",
      light: "Claro",
      dark: "Oscuro",
    },
  },

  vault: {
    title: "Almacenamiento privado",
    summary:
      "Tu diario se guarda cifrado con esta contraseña, y lo que guardamos no se puede leer sin ella. Si la perdés, lo que escribiste se pierde en la práctica: tocá para ver qué significa eso.",
    protectTitle: "Protegé tu diario",
    protectPrompt:
      "Elegí una contraseña antes de escribir nada. Es lo que cifra tu diario, y lo único que puede abrirlo.",
    lockedState: "Bloqueado",
    unlockedState: "Desbloqueado en este dispositivo",
    protectedTitle: "Qué protege esto",
    protectedBody:
      "Tu contraseña nunca sale de este navegador, y la clave que sale de ella solo la tenemos el tiempo que lleva responder algo que pediste. Todo lo que escribís se cifra antes de guardarse, así que lo que queda en nuestra base de datos y en nuestros backups no se puede leer, ni siquiera para quien opera este servicio.",
    visibleTitle: "Qué podemos ver",
    visibleBody:
      "Para que una entrada se pueda buscar hay que leerla, así que lo que escribís pasa por nuestro servidor camino a ser cifrado, y las palabras clave y los embeddings numéricos que salen de ahí se guardan sin cifrar junto a la entrada. Nada de eso queda guardado ni registrado en claro.",
    lossTitle: "Si olvidás tu contraseña",
    lossBody:
      "Lo que escribiste sería muy difícil de recuperar: lo suficiente como para darlo por perdido, y lo suficiente como para que no podamos hacerlo por vos aunque nos lo pidas. Una passkey abre el mismo diario, así que sumar una es una buena segunda forma de entrar. Cambiar esta contraseña todavía no lo podés hacer vos: pedilo y lo arreglamos.",
    password: "Contraseña",
    confirm: "Confirmar contraseña",
    create: "Cifrar mi diario",
    creating: "Configurando...",
    unlockTitle: "Desbloqueá tu diario",
    unlockPrompt: "Lo que escribís está cifrado. Tu contraseña es lo único que lo abre.",
    unlock: "Desbloquear",
    unlocking: "Desbloqueando...",
    unlockWithPasskey: "Usar una passkey",
    lock: "Bloquear ahora",
    passkeys: "Passkeys",
    noPasskeys:
      "Todavía no hay ninguna. Una passkey te deja desbloquear en este dispositivo sin escribir la contraseña.",
    passkeyStepTitle: "Sumá una forma más rápida de entrar",
    passkeyStepPrompt:
      "Una passkey abre tu diario con tu huella o tu cara, y es una segunda forma de volver a entrar si alguna vez se te va la contraseña.",
    notNow: "Ahora no",
    addPasskey: "Agregar una passkey",
    addingPasskey: "Esperando a tu dispositivo...",
    removePasskey: "Quitar",
    errors: {
      tooShort: "Usá al menos 12 caracteres. Es lo único que protege lo que escribís.",
      mismatch: "Esas dos no coinciden.",
      wrongPassword: "Esa contraseña no abre esta bóveda.",
      passkeyUnsupported: "Este navegador o dispositivo no puede guardar una clave en una passkey.",
      passkeyFailed: "Tu dispositivo no completó la operación. No cambió nada.",
      rejected: "Rechazamos esa configuración por ser demasiado débil para guardarla.",
      noStorage:
        "Este navegador no nos deja guardar tu clave, así que el diario no puede quedar abierto. La navegación privada y el bloqueo de datos del sitio hacen esto.",
      failed: "No se guardó. No cambió nada.",
    },
  },

  validation: {
    required: "Esto no puede estar vacío",
    tooLong: "Esto es demasiado largo",
    notAllowed: "Elegí una de las opciones",
    badEmail: "Eso no parece una dirección de correo",
    badTimezone: "Esa zona horaria no la conoce este navegador",
  },
};

export default es;
