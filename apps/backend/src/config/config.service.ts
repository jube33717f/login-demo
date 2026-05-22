import assert from 'node:assert';

import { Injectable } from '@nestjs/common';
import convict, { type Format } from 'convict';
import convictValidators from 'convict-format-with-validator';

import configSchema from './config.schema';

const nonEmptyStringFormat: Format = {
  name: 'non-empty-string',
  validate: (value: unknown) => {
    assert(typeof value === 'string', 'value is not a string');
    assert(value.length > 0, 'value cannot be empty');
  },
  coerce: (value: unknown) => String(value),
};

convict.addFormat(nonEmptyStringFormat);
convict.addFormats(convictValidators);

@Injectable()
export class ConfigService {
  private readonly config = convict(configSchema);

  constructor() {
    this.config.validate({ allowed: 'strict' });
  }

  get get() {
    return <T extends Parameters<typeof this.config.get>[0]>(key: T) =>
      this.config.get(key);
  }
}
