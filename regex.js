const regex = {
  'dacionIdentificacion': /^[0-9]{7,12}$/i,
  'validacionContacto': /^[0-9]{10}$/i,
  'validacionNombre': /^[A-Za-z\s]{3,32}$/i,
  'validateNumber': /^([1-9]\d{1,}|[1-9]\d+)$/i,
};


module.exports = {
  regex,
};
