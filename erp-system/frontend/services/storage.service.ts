import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'erp_access_token';
const REFRESH_KEY = 'erp_refresh_token';

/**
 * Cross-platform secure storage.
 * Uses SecureStore on native (encrypted), AsyncStorage on web.
 */
async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const storage = {
  getAccessToken: () => getItem(TOKEN_KEY),
  setAccessToken: (token: string) => setItem(TOKEN_KEY, token),
  removeAccessToken: () => removeItem(TOKEN_KEY),

  getRefreshToken: () => getItem(REFRESH_KEY),
  setRefreshToken: (token: string) => setItem(REFRESH_KEY, token),
  removeRefreshToken: () => removeItem(REFRESH_KEY),

  clearTokens: async () => {
    await removeItem(TOKEN_KEY);
    await removeItem(REFRESH_KEY);
  },
};
