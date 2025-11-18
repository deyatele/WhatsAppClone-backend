import { User } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

export type Exact<T, Shape extends T> = T & {
  [K in Exclude<keyof Shape, keyof T>]: never;
};
