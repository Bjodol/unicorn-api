import { ValidationError } from "jsonschema";

export class SchemaValidationError extends Error {
  errors: ValidationError[];

  constructor(errors: ValidationError[], ...args) {
    super(...args);
    this.name = "Schema error";
    this.message = "Validation error";
    this.errors = errors;
  }
}
