// Helper functions to work around strict Supabase type checking
// Use these to bypass TypeScript's strict type validation without causing deep instantiation

// Simple query builder that casts the entire query chain
export function queryAs<T = any>(query: any): T {
  return query;
}

// Cast data for insert operations
export function insertData<T extends Record<string, any>>(data: T | T[]): any {
  return data;
}

// Cast data for update operations  
export function updateData<T extends Record<string, any>>(data: T): any {
  return data;
}
