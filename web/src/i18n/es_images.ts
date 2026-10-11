import type { ImagesDictionary } from "./en_images";

const images: ImagesDictionary = {
  attach: "Adjuntar fotos",
  remove: "Quitar esta foto",
  attached: "Una foto que adjuntaste",
  opening: "Abriendo las fotos...",
  unreadable: "Esta foto no se pudo abrir con tu clave.",
  loadFailed: "No se pudieron cargar las fotos de este día. Probá en un momento.",
  problems: {
    type: "Solo se pueden mandar fotos PNG, JPEG o WebP. Guardala en uno de esos formatos y probá de nuevo.",
    tooLarge: "Esa foto es demasiado grande para mandar, aun achicada. Probá con una más chica.",
    tooMany: "Podés mandar hasta {max} fotos por mensaje. Mandá el resto en el siguiente.",
    unreadable: "No se pudo leer esa foto. Probá guardarla como PNG o JPEG primero.",
    busy: "Las fotos solo pueden empezar un mensaje nuevo. Esperá a que termine esta respuesta y mandalas.",
  },
};

export default images;
