/**
 * Se valida si es un objeto que no se encuentra vacio
 * 
 * @param {Object} value 
 * @returns Boolean
 */
function isEmptyObject(value) {
  return (
    value && Object.keys(value).length === 0 && value.constructor === Object 
  );
}

module.exports = { isEmptyObject };
