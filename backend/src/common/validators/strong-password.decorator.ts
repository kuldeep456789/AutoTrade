import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { validatePassword } from './password.validator';

@ValidatorConstraint({ name: 'strongPassword', async: false })
export class StrongPasswordValidator implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    return validatePassword(value).valid;
  }

  defaultMessage(args: ValidationArguments): string {
    if (typeof args.value !== 'string' || !args.value) {
      return 'Password is required';
    }
    return validatePassword(args.value).message ?? 'Password is not strong enough';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: StrongPasswordValidator,
    });
  };
}