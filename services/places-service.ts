import { ENV } from '@/constants/env';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  ENV.API_BASE_URL ||
  'http://10.0.2.2:3002';

type TrendingPlacesParams = {
  lat?: number | null;
  lng?: number | null;
  homeArea?: string | null;
};

export async function fetchTrendingPlaces({ lat, lng, homeArea }: TrendingPlacesParams = {}) {
  const params = new URLSearchParams();

  if (lat != null && lng != null) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  } else if (homeArea) {
    params.set('homeArea', homeArea);
  }

  const query = params.toString();
  const response = await fetch(`${API_URL}/places/trending${query ? `?${query}` : ''}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with ${response.status}`);
  }

  return response.json();
}
