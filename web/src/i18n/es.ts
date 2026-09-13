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
    chatTitle: "Chat",
    chatPlaceholder: "Preguntá sobre el día de hoy, o simplemente empezá a escribir...",
    chatSend: "Enviar",
    todayTitle: "Hoy",
    mocked: "Contenido de ejemplo",
    resizeToday: "Redimensionar la entrada de hoy",
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
    absent: "Todavía no ciframos lo que escribís.",
    lockedState: "Bloqueado",
    unlockedState: "Desbloqueado en este dispositivo",
    protectedTitle: "Qué protege esto",
    protectedBody:
      "Tus entradas y conversaciones se cifran en este navegador, con una clave derivada de tu contraseña, antes de llegarnos. Guardamos el resultado y nunca la clave, así que nadie que lea nuestra base de datos, nuestros backups o un volcado de cualquiera de los dos puede leer lo que escribís. Eso incluye a quien opera este servicio.",
    visibleTitle: "Qué sigue siendo legible",
    visibleBody:
      "Para que la búsqueda funcione, guardamos sin cifrar palabras clave y embeddings numéricos de lo que escribís. Los embeddings no son un resumen seguro: se puede reconstruir buena parte del texto original a partir de ellos. Y cuando le preguntás algo al asistente sobre tu diario, las entradas que necesita se descifran en memoria para responderte, nunca se guardan así, y nunca quedan en los registros.",
    lossTitle: "Si olvidás tu contraseña",
    lossBody:
      "Nadie puede recuperar lo que escribiste, porque nadie tuvo nunca la clave. Una passkey abre los mismos datos, así que tener una también es una forma de volver a entrar, pero si perdés las dos se pierde para siempre.",
    password: "Contraseña",
    confirm: "Confirmar contraseña",
    create: "Cifrar mi diario",
    creating: "Configurando...",
    unlock: "Desbloquear",
    unlocking: "Desbloqueando...",
    unlockWithPasskey: "Usar una passkey",
    lock: "Bloquear ahora",
    passkeys: "Passkeys",
    noPasskeys:
      "Todavía no hay ninguna. Una passkey te deja desbloquear en este dispositivo sin escribir la contraseña.",
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
