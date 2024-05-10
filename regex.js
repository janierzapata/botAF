const regex = {
  'valiIdentificacion': /^[0-9]{7,12}$/i,
  'validacionContacto': /^[0-9]{10}$/i,
  'validacionNombre': /^[A-Za-z\s]{3,32}$/i,
};


module.exports = {
  regex,
};
