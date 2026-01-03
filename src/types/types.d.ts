import { User } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

export type Exact<T, Shape extends T> = T & {
  [K in Exclude<keyof Shape, keyof T>]: never;
};

// Типы для совместимости с Prisma JSON полями
export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export type JsonObject = { [Key: string]: JsonValue };
export type JsonArray = JsonValue[];

// Типы для Prisma Input
export type InputJsonValue = string | number | boolean | null | InputJsonObject | InputJsonArray;
export type InputJsonObject = { [Key: string]: InputJsonValue };
export type InputJsonArray = InputJsonValue[];

// Тип JsonNull, как он определен в Prisma
export type JsonNull = null;
