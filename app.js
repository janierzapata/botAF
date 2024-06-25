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
const { costos, services, conditions } = require("./data.json");

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
const MONGO_DB_URI = "mongodb://localhost:27017";
const MONGO_DB_NAME = "db_bot";

const flowexit = addKeyword(EVENTS.ACTION)
  .addAnswer("¡Gracias por utilizar nuestros servicios, estamos para servirte!")
  .addAnswer("Deseo que tengas un excelente día. ¡Hasta la próxima!");

const flowmenuprograms = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "Selecciona la acción que deseas realizar",
    "1) ¿Que se ve en este programa?",
    "2) Jornadas de estudio",
    "3) Costos ",
    "4) Matricularse",
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
            *_Duración:_* ${item.duration}
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

        validateHour()
          .then(async () => {
            await flowDynamic(
              "⏳ Serás redirigido con un asesor que te guiará con tu proceso de matrícula 🏃‍♂️"
            );
            setTimeout(async () => {
              await state.update({ asesor: false });
            }, ADVISER);
          })
          .catch(async (err) => {
            await flowDynamic(err);
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
    "1) Lunes a viernes - mañana",
    "2) Lunes a viernes - tarde",
    "3) Sábados",
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

        validateHour()
          .then(async () => {
            await flowDynamic(
              "⏳ Serás redirigido con un asesor que te indicará las fechas disponibles 📅"
            );
            setTimeout(async () => {
              await state.update({ asesor: false });
            }, ADVISER);
          })
          .catch(async (err) => {
            await flowDynamic(err);
            await state.update({ asesor: false });
            return gotoFlow(flowprograms);
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

      await state.update({
        institutionData: {
          ...state.getMyState().institutionData,
          nameInstitution: ctx.body,
        },
      });
    }
  )
  .addAnswer(
    ["Ingresa el lugar donde se realizara la brigada"],
    { capture: true, idle: IDLE },
    async (ctx, { gotoFlow, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      await state.update({
        institutionData: {
          ...state.getMyState().institutionData,
          place: ctx.body,
        },
      });
    }
  )
  .addAnswer(
    [
      "Ingresa la fecha estipulada para el evento (dd/mm/yyyy)",
      `*Ejemplo: (${new Date().toLocaleString().split(",")[0]})*`,
    ],
    { capture: true, idle: IDLE },
    async (ctx, { fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      //TODO: Implementar el validador de fechas

      await state.update({
        institutionData: {
          ...state.getMyState().institutionData,
          date: ctx.body,
        },
      });
    }
  )
  .addAnswer(
    [
      "Ingresa la cantidad de personas estimadas a atender",
      `*Ejemplo: (${new Date().toLocaleString().split(",")[0]})*`,
    ],
    { capture: true, idle: IDLE },
    async (ctx, { fallBack, state }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      if (!regex.validateNumber.test(ctx.body)) {
        return fallBack(["Por favor ingresa una opción valida"]);
      }

      await state.update({
        institutionData: {
          ...state.getMyState().institutionData,
          amount: ctx.body,
        },
      });
    }
  )
  .addAnswer(
    [
      "Ingrese los servicios que desea realizar en el evento separado por comas (',').",
      "",
      "*Recuerde que los servicios disponibles son:",
      "*  • PELUQUERIA*",
      "*  • MANICURE*",
      "*  • SERVICIOS DE CEJAS*",
      "*  • HIGIENE FACIAL*",
      "*  • MAQUILLAJE*",
    ],
    { capture: true, idle: IDLE },
    async (ctx, { state, flowDynamic, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        return gotoFlow(flowexit);
      }

      await state.update({
        institutionData: {
          ...state.getMyState().institutionData,
          services: ctx.body,
        },
      });

      await state.update({ asesor: true });
   

      validateHour()
        .then(async () => {
          await flowDynamic(
            "*⏳🏃‍♂️ Serás redirigido con un asesor para confirmar el servicio 🏃‍♂️*"
          );
          setTimeout(async () => {
            await state.update({ asesor: false });
          }, ADVISER);
        })
        .catch(async (err) => {
          await flowDynamic(err);
          await state.update({ asesor: false });
          return gotoFlow(flowprograms);
        });

      console.log(
        "Este es mi estado al final de data institution",
        state.getMyState()
      );
    }
  );

const flowprograms = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "¿En que programa técnico estas interesado?",
    "1) Cuidado estético de manos y pies",
    "2) Maquillaje artístico y decorativo",
    "3) Peluquería",
    "4) Barbería y peluquería masculina",
    "",
    "8) Regresar al menú anterior",
    "9) Salir",
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
    "La Academia Francia Belleza y Diseño Cauca, institución para el trabajo y desarrollo humano, legalmente constituida en la ciudad de Popayán desde el año 2005, con Licencia de Funcionamiento #20161700124544 de 19 SEPTIEMBRE DE 2016, tiene un componente social, ofreciendo a la comunidades Popayán y municipios aledaños los SERVICIOS GRATUITOS en corte de cabello femenino y masculino, manicure tradicional, diseño de cejas, entre otros.",
  ])
  .addAnswer(
    conditions,
    null,
    (_, { gotoFlow }) => {
      setTimeout(() => {
        return gotoFlow(flowinstitutiondata);
      }, 3000);
    },
    [flowinstitutiondata]
  );

const flowmainmenu = addKeyword(EVENTS.ACTION).addAnswer(
  [
    "Marca la opción por la cual necesitas información",
    "",
    "1) Programas educativos",
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

      if (!regex.dacionIdentificacion.test(ctx.body)) {
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
      "Ingresa el número de telefono celular de contacto, sin indicador de pais. ",
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
      "¿En qué ciudad, corregimiento o vereda te encuentras?",
      "",
      "*Sin números, comas, puntos o caracteres especialesa*",
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
    "Al utilizar este medio aceptas las políticas, términos y condiciones, responsabilizándote de la información que sea compartida a través de este medio y autoriza el uso de esta misma a la *ACADEMIA FRANCIA BELLEZA Y DISEÑO CAUCA* basado en la política de tratamiento de información en http://adacemiafrancia.com.co/tratamiento-de-datos",
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
