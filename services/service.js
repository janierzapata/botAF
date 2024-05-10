const axios = require("axios");

const API_INFOAF = process.env.API_INFOAF;

const getProgram = (program) => {
  return new Promise((resolve, reject) => {
    axios
      .get(`${API_INFOAF}/info/program/${program}`, {})
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject({ err });
      });
  });
};

const validateHour = () => {
  return new Promise((resolve, reject) => {
    var ahora = new Date();
    var horaActual = ahora.getHours();

    if (horaActual >= 9 && horaActual < 22) return resolve();

    reject(
      "*❌❌Estás fuera de los horarios de atención❌❌* \nRecuerda que nuestros horarios son de lunes a sábado, entre las 9 am y las 5 pm "
    );
  });
};

const validateDate = () => {
  //TODO: Validar fecha dependiendo de la disponibilidad de las brigadas
  return true;
};

module.exports = {
  getProgram,
  validateHour,
  validateDate,
};
