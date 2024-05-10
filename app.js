require("dotenv").config();
const { regex } = require("./regex");
const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} = require("@bot-whatsapp/bot");

const QRPortalWeb = require("@bot-whatsapp/portal");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MongoAdapter = require("@bot-whatsapp/database/mongo");

//* service
const { getProgram, validateHour } = require("./services/service");
const { costos, services } = require("./data.json");

//? Variables de entorno
const IDLE = parseInt(process.env.IDLE);
const TIMEOUT = parseInt(process.env.TIMEOUT);
const ADVISER = parseInt(process.env.ADVISER);

const programs = JSON.parse(process.env.PROGRAMS_IDS);

const returnToPrograms = (gotoFlow) => {
  setTimeout(() => {
    return gotoFlow(flowmenuprograms);
  }, TIMEOUT);
};

//*  Declaramos las conexiones de Mongo
const MONGO_DB_URI = "mongodb://0.0.0.0:27017";
const MONGO_DB_NAME = "db_bot";

const flowexit = addKeyword(EVENTS.ACTION)
  .addAnswer("¡Gracias por utilizar nuestros servicios, estamos para servirte!")
  .addAnswer("Deseo que tengas un excelente día. ¡Hasta la próxima!");

const flowmenuprograms = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "Selecciona la accion que deseas realizar",
    "1) ¿Que se ve en este programa?",
    "2) Jornadas de estudio",
    "3) Costos ",
    "4) matricularse",
    "",
    "0) Regresar al menú principal",
    "8) Regresar al menú anterior",
    "9) Salir",
  ],
  { capture: true, idle: IDLE },
  async (ctx, { gotoFlow, fallBack, flowDynamic, state }) => {
    if (ctx?.idleFallBack) {
      return gotoFlow(flowexit);
    }

    let str;
    switch (ctx.body) {
      case "1":
        str = "*En este programa verás el siguiente contenido:* \n";

        state.getMyState().searchedProgram.content.map((item) => {
          str += `• ${item}\n`;
        });
        await flowDynamic(str);
        return returnToPrograms(gotoFlow);
      case "2":
        str = "*Nuestros programas manejan los siguientes horarios:*";
        state.getMyState().searchedProgram.schedules.map((item) => {
          const { schedule } = item;
          str += `
          *${schedule.days}*
            *_Jornada:_*  ${schedule.time} 
            *_Duracion:_* ${item.duration}
          `;
        });

        await flowDynamic(str);
        return returnToPrograms(gotoFlow);
      case "3":
        str = "*A continuación te dejamos el listado de precios:* ";
        costos.map((item) => {
          str += `
              *${item.title}*
              ${item.matricula}
              ${item.seguro}
              ${item.mensualidad}
              ${item.completo}
          `;
        });
        await flowDynamic(str);
        return returnToPrograms(gotoFlow);
      case "4":
        await state.update({ asesor: true });
        const cb = () => {
          setTimeout(async () => {
            await state.update({ asesor: false });
          }, ADVISER);
        };
        const msj =
          "⏳ Serás redirigido con un asesor que te guiara con tu proceso de matrícula 🏃‍♂️";
        validateHour(flowDynamic, msj, cb).then(async () => {
          await state.update({ asesor: false });
          return gotoFlow(flowprograms);
        });
        break;
      case "0":
        return gotoFlow(flowmainmenu);
      case "8":
        return gotoFlow(flowprograms);
      case "9":
        return gotoFlow(flowexit);
      default:
        return fallBack(["Por favor ingresa una opción valida"]);
    }
  }
);

const flowscheduleservices = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "¿En qué jornada deseas realizarte el procedimiento?",
    "",
    "1) lunes a viernes - mañana",
    "2) lunes a viernes - tarde",
    "3) sábados",
    "",
    "0) Regresar al menú principal",
    "8) Regresar al menú anterior",
    "9) Salir",
  ],
  { capture: true, idle: IDLE },
  async (ctx, { gotoFlow, fallBack, flowDynamic, state }) => {
    console.log("ingreso");
    if (ctx?.idleFallBack) {
      console.log("paila");
      return gotoFlow(flowexit);
    }

    switch (ctx.body) {
      case "1":
      case "2":
      case "3":
        await state.update({
          service: {
            ...state.getMyState().service,
            schedule: services.schedules[parseInt(ctx.body) - 1],
          },
          asesor: true,
        });

        const cb = () => {
          setTimeout(async () => {
            await state.update({ asesor: false });
          }, ADVISER);
        };

        const msj =
          "⏳ Serás redirigido con un asesor que te indicará las fechas disponibles 📅";

        validateHour(flowDynamic, msj, cb).then(async () => {
          await state.update({ asesor: false });
          return gotoFlow(flowservices);
        });
        break;
      case "0":
        return gotoFlow(flowmainmenu);
      case "8":
        return gotoFlow(flowservices);
      case "9":
        return gotoFlow(flowexit);
      default:
        return fallBack(["Por favor ingresa una opción valida"]);
    }
  }
);

const flowinstitutiondata = addKeyword(EVENTS.ACTION)
  .addAnswer(
    ["Ingresa el nombre de la institución que solicita el servicio"],
    { capture: true, idle: IDLE },
    async (ctx, { gotoFlow, fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      if (!regex.validacionNombre.test(ctx.body)) {
        return fallBack(
          "Por favor ingresa un nombre válido, *sin puntos, números o caracteres especiales*"
        );
      }

      await state.update({ institutionData: { name: ctx.body } });
    }
  )
  // .addAnswer(
  //   ["Ingresa el nombre de la persona a cargo"],
  //   { capture: true, idle: IDLE },
        // async (ctx, { gotoFlow, fallBack, state }) => {
  //     if (ctx?.idleFallBack) {
  //       return gotoFlow(flowexit);
  //     }

  //     if (!regex.validacionNombre.test(ctx.body)) {
  //       return fallBack(
  //         "Por favor ingresa un nombre válido, *sin puntos, números o caracteres especiales*"
  //       );
  //     }

  //     await state.update({ institutionData: { nameDependant: ctx.body } });
  //   }
  // )
  // .addAnswer(
  //   [
  //     "Digita el número de contacto de la persona a cargo, sin indicador de pais. ",
  //     " ",
  //     "*Debe tener 10 digitos*",
  //   ],
  //   { capture: true, idle: IDLE },
  //   async (ctx, { gotoFlow, fallBack, state }) => {
  //     if (ctx?.idleFallBack) {
  //       return gotoFlow(flowexit);
  //     }

  //     if (!regex.validacionContacto.test(ctx.body)) {
  //       return fallBack(
  //         "Por favor ingresa un número de contacto valido,",
  //         "",
  //         "*sin puntos, comas, letras o caracteres especiales*"
  //       );
  //     }

  //     await state.update({ institutionData: { celDependant: ctx.body } });
  //   }
  // )
  .addAnswer(
    ["Ingresa el lugar donde se realizara la brigada"],
    { capture: true, idle: IDLE },
    async (ctx, { gotoFlow, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      await state.update({ institutionData: { celDependant: ctx.body } });
    }
  )
  .addAnswer([
    "Ingresa la fecha estipulada para el evento (dd/mm/yyyy)",
    `*Ejemplo: (${new Date().toLocaleString().split(",")[0]})*`,
  ],
  {capture:true, idle:IDLE},
  (ctx, {})=>{
    if (ctx?.idleFallBack) {
      return gotoFlow(flowexit);
    }
  }
);







const flowprograms = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "¿En que programa tecnico estas interesado?",
    "1) Cuidado estético de manos y pies",
    "2) Maquillaje artístico y decorativo",
    "3) Peluquería",
    "4) Barbería y peluquería masculina",
    "",
    "8) Regresar al menú anterior",
    "9) Salir",
    // TODO: Investigar la opcion de devolver al menu anterior
  ],
  { capture: true, idle: IDLE },
  async (ctx, { gotoFlow, fallBack, flowDynamic, state }) => {
    if (ctx?.idleFallBack) {
      return gotoFlow(flowexit);
    }

    switch (ctx.body) {
      case "1":
      case "2":
      case "3":
      case "4":
        await state.update({ idProgram: programs[ctx.body] });
        getProgram(programs[ctx.body])
          .then(async (response) => {
            if (response.status != 200) {
              await flowDynamic(
                "Estamos presentando problemas técnicos, por favor inténtalo de nuevo en unos minutos."
              );
              console.log("Ocurrio un error:", { err });
              return gotoFlow(flowexit);
            }
            await state.update({ searchedProgram: response.data });
          })
          .catch(async (err) => {
            await flowDynamic(
              "Estamos presentando problemas técnicos, por favor inténtalo de nuevo en unos minutos."
            );
            console.log("Ocurrio un error:", { err });
            return gotoFlow(flowexit);
          });
        break;
      case "8":
        return gotoFlow(flowmainmenu);
      case "9":
        return gotoFlow(flowexit);
      default:
        return fallBack(["Por favor ingresa una opción valida"]);
    }

    return gotoFlow(flowmenuprograms);
  },
  [flowmenuprograms]
);

const flowservices = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "Marca la opción por la cual necesitas información",
    "",
    "1) Manos y pies",
    "2) Implantes",
    "3) Tratamientos capilares",
    "4) Higiene facial",
    "5) Corte de cabello",
    "6) Blower _(Cepillado)_",
    "",
    "8) Regresar al menú anterior",
    "9) Salir",
    "",
    "*Los procedimientos no tienen ningún costo.*",
    "*_Recuerda adquirir kit de BIOSEGURIDAD y los productos que se requieren._*",
  ],
  { capture: true, idle: IDLE },
  async (ctx, { gotoFlow, fallBack, flowDynamic, state }) => {
    if (ctx?.idleFallBack) {
      return gotoFlow(flowexit);
    }

    switch (ctx.body) {
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
        await state.update({
          service: { desc: services.desc[parseInt(ctx.body) - 1] },
        });
        return gotoFlow(flowscheduleservices);
      case "8":
        return gotoFlow(flowmainmenu);
      case "9":
        return gotoFlow(flowexit);
      default:
        return fallBack(["Por favor ingresa una opción valida"]);
    }
  },
  [flowscheduleservices]
);

const flowbrigades = addKeyword(EVENTS.ACTION)
  .addAnswer([
    "La Academia Francia Belleza y Diseño Cauca, institución para el trabajo y desarrollo humano, legalmente constituida en la ciudad de Popayán desde el año 2005, con Licencia de Funcionamient#20161700124544 de 19 SEPTIEMBRE DE 2016, tiene un componente social, ofreciendo a la comunidade Popayán y municipios aledaños los SERVICIOS GRATUITOS en corte de cabello femenino, masculinmanicure tradicional, diseño de cejas entre otros",
  ])
  .addAnswer(
    [
      "*CONDICIONES:*",
      "",
      "1. Dependiendo del lugar donde se llevará a cabo la jornada de brigada, se solicitará el transporte del grupo de practicantes de la academia Francia Belleza y Diseño Cauca, partiendo de la institución sede principal carrera 4 # 0 – 66 Barrio Vásquez Cobo – al lugar de la brigada, y una vez finalizada la actividad, transporte de regreso a la institución.",
      "2. Es importante el número de usuarios que recibirán el servicio, ya que los servicios son prestados por grupos de practicantes, acompañados por un instructor, por esta razón no se puede llevar la mitad de un grupo y dejar la otra mitad en la institución, mínimo grupo de 15 practicantes.",
      "3. El lugar designado para la realización de la actividad debe ser cubierto, por condiciones de lluvia o sol excesivo.",
      "4. Dependiendo del número de practicantes coordinado previamente con la institución a asistir a la jornada de brigada, será el número de sillas tanto para modelos (usuarios) como para practicantes:",
      "     • PELUQUERÍA: solo requiere silla para modelo (usuario). – mesa para ubicar la herramienta",
      "     • MANICURE: silla para practicante, silla para modelo, mesa para ubicar materiales",
      "     • SERVICIOS DE CEJAS, HIGIENE FACIAL, MAQUILLAJE: silla para practicante, silla para modelo, mesa para ubicar materiales.",
      "5. Puntos de energía para conectar las herramientas o extensiones eléctricas. ",
      "6. Dependiendo si la actividad se extiende por ambas jornadas, (opcional) refrigerio para las practicantes.",
    ],
    null,
    (_, { gotoFlow }) => {
      setTimeout(() => {
        return gotoFlow(flowinstitutiondata);
      }, 10000);
    },
    [flowinstitutiondata]
  );

const flowmainmenu = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "Marca la opción por la cual necesitas información",
    "",
    "1) Programas Educativos",
    "2) Servicios a realizar",
    "3) Brigadas",
    "",
    "9) Salir",
  ],
  { capture: true, idle: IDLE },
  async (ctx, { gotoFlow, fallBack, flowDynamic, state }) => {
    if (ctx?.idleFallBack) {
      return gotoFlow(flowexit);
    }

    switch (ctx.body) {
      case "1":
        return gotoFlow(flowprograms);
      case "2":
        return gotoFlow(flowservices);
      case "3":
        // TODO: Realizar la integracion del flujo para las Brigadas
        return gotoFlow(flowbrigades);
      case "9":
        return gotoFlow(flowexit);
      default:
        return fallBack(["Por favor ingresa una opción valida"]);
    }
  },
  [flowprograms, flowservices, flowbrigades]
);

const flowuserdata = addKeyword(EVENTS.ACTION)
  .addAnswer(
    ["Por favor indícanos cuál es tu nombre"],
    { capture: true, idle: IDLE },
    async (ctx, { gotoFlow, fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      if (!regex.validacionNombre.test(ctx.body)) {
        return fallBack(
          "Por favor ingresa un nombre válido, *sin puntos, números o caracteres especiales*"
        );
      }

      await state.update({ userData: { name: ctx.body } });
    }
  )
  .addAnswer(
    [
      "Seleccione el tipo de documento de identidad",
      "",
      "1) Cédula de ciudadanía",
      "2) Tarjeta de identidad",
      "3) Cédula de extranjería",
    ],
    { capture: true, idle: IDLE },

    async (ctx, { gotoFlow, fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      switch (ctx.body) {
        case "1":
          await state.update({
            userData: { ...state.get("userData"), documentType: "CC" },
          });
          break;
        case "2":
          await state.update({
            userData: { ...state.get("userData"), documentType: "TI" },
          });
          break;
        case "3":
          await state.update({
            userData: { ...state.get("userData"), documentType: "CE" },
          });
          break;
        default:
          return fallBack("Ingresa una opción válida");
      }
    }
  )
  .addAnswer(
    [
      "Escribe tu número de documento de identidad",
      "",
      "*Solo números, sin comas, puntos o caracteres especialesa*",
    ],
    { capture: true, idle: IDLE },

    async (ctx, { gotoFlow, fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      if (!regex.valiIdentificacion.test(ctx.body)) {
        return fallBack(
          "Por favor ingresa un documento valido, *sin puntos, comas, letras o caracteres especiales*"
        );
      }
      await state.update({
        userData: { ...state.get("userData"), documentNumber: ctx.body },
      });
    }
  )
  .addAnswer(
    [
      "Ingresa el número de  telefono celular de contacto, sin indicador de pais. ",
      " ",
      "*Debe tener 10 digitos*",
    ],
    { capture: true, idle: IDLE },

    async (ctx, { gotoFlow, fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      if (!regex.validacionContacto.test(ctx.body)) {
        return fallBack(
          "Por favor ingresa un número de contacto valido, *sin puntos, comas, letras o caracteres especiales*"
        );
      }
      await state.update({
        userData: { ...state.get("userData"), contactNumber: ctx.body },
      });
    }
  )
  .addAnswer(
    [
      "¿En que ciudad, corregimiento o vereda te encuentras?",
      "",
      "*Solo números, sin comas, puntos o caracteres especialesa*",
    ],
    { capture: true, idle: IDLE },

    async (ctx, { gotoFlow, fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      if (!regex.validacionNombre.test(ctx.body)) {
        return fallBack(
          "Por favor ingresa un nombre valido, *sin puntos, comas, numeros o caracteres especiales*"
        );
      }

      await state.update({
        userData: { ...state.get("userData"), location: ctx.body },
      });

      console.log(
        "este es mi estado al final de el dataUser",
        state.getMyState()
      );
      return gotoFlow(flowmainmenu);
    },
    [flowmainmenu, flowexit]
  );

const flowPrincipal = addKeyword(EVENTS.WELCOME)
  .addAction(async (_, { state, endFlow }) => {
    const myState = state.getMyState();

    if (!!myState && !!myState.asesor) {
      return endFlow();
    }
  })
  .addAnswer([
    "Hola, te damos la bienvenida a nuestro canal de WhatsApp *ACADEMIA FRANCIA BELLEZA Y DISEÑO CAUCA*",
  ])
  .addAnswer([
    "Soy tu asistente virtual y me encanta estar aquí para ayudarte, cuenta conmigo para lo que necesites.",
  ])
  .addAnswer([
    "Al utilizar este medio aceptas las políticas, términos y condiciones, responsabilizándote de la información que sea compartida atreves de este medio y autoriza el uso de esta misma a la *ACADEMIA FRANCIA BELLEZA Y DISEÑO CAUCA* basado en la política de tratamiento de información en http://adacemiafrancia.com.co/tratamiento-de-datos",
  ])
  .addAnswer(
    [
      "Autorizo el tratamiento de datos personales y acepto los términos y condiciones de nuestros canales de atención.",
      "",
      "1) Aceptar",
      "2) Rechazar",
    ],
    { capture: true, idle: IDLE },
    (ctx, { fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      switch (ctx.body) {
        case "1":
          return gotoFlow(flowuserdata);
        case "2":
          return gotoFlow(flowexit);
        default:
          return fallBack();
      }
    },
    [flowuserdata]
  );

const main = async () => {
  const adapterDB = new MongoAdapter({
    dbUri: MONGO_DB_URI,
    dbName: MONGO_DB_NAME,
  });
  const adapterFlow = createFlow([
    flowPrincipal,
    flowuserdata,
    flowinstitutiondata,
  ]);
  const adapterProvider = createProvider(BaileysProvider);

  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
  QRPortalWeb();
};

main();
