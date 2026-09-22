import * as SecureStore from 'expo-secure-store';

const SERVICE_KEY_REF = 'orbit_supabase_service_key';

export function getStoredServiceKey(): Promise<string | null> {
  return SecureStore.getItemAsync(SERVICE_KEY_REF);
}

export async function storeServiceKey(key: string): Promise<void> {
  await SecureStore.setItemAsync(SERVICE_KEY_REF, key);
}

export async function removeStoredServiceKey(): Promise<void> {
  await SecureStore.deleteItemAsync(SERVICE_KEY_REF);
}
