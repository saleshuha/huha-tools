export interface Store {
  id: string;
  user_id: string;
  name: string;
  location?: string;
  description?: string;
  currency: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStore {
  name: string;
  location?: string;
  description?: string;
  currency: string;
  country: string;
  is_active?: boolean;
}