// Helper functions to work around strict Supabase type checking
// These helpers cast parameters to 'any' to bypass TypeScript's strict type validation

export function eq<T>(column: string, value: T): [column: any, value: any] {
  return [column as any, value as any];
}

export function neq<T>(column: string, value: T): [column: any, value: any] {
  return [column as any, value as any];
}

export function inList<T>(column: string, values: T[]): [column: any, values: any] {
  return [column as any, values as any];
}

export function gte<T>(column: string, value: T): [column: any, value: any] {
  return [column as any, value as any];
}

export function lte<T>(column: string, value: T): [column: any, value: any] {
  return [column as any, value as any];
}

export function gt<T>(column: string, value: T): [column: any, value: any] {
  return [column as any, value as any];
}

export function lt<T>(column: string, value: T): [column: any, value: any] {
  return [column as any, value as any];
}

export function updateData<T extends Record<string, any>>(data: T): any {
  return data as any;
}

export function insertData<T extends Record<string, any>>(data: T | T[]): any {
  return data as any;
}
