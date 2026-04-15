const createValidator = () => {
  const validator = () => null;
  validator.isRequired = validator;
  return validator;
};

const PropTypes = {
  any: createValidator(),
  array: createValidator(),
  bool: createValidator(),
  func: createValidator(),
  node: createValidator(),
  number: createValidator(),
  object: createValidator(),
  string: createValidator(),
  arrayOf: () => createValidator(),
  oneOf: () => createValidator(),
  shape: () => createValidator()
};

export default PropTypes;
