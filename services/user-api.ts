import { AuthUser } from '@/contexts/auth-context';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3002';
const USERS_API_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? `${API_BASE_URL}/users`;

type BackendUserResponse = {
  _id?: string;
  id?: string;
  googleId?: string;
  name?: string;
  email?: string;
  picture?: string | null;
  profilePicture?: string | null;
  contactNumber?: string | null;
};

type GoogleAuthResponse = {
  token: string;
  user: BackendUserResponse;
};

function getBackendUserId(user: BackendUserResponse) {
  return user._id ?? user.id;
}

function mapBackendUserToAuthUser(backendUser: BackendUserResponse): AuthUser {
  return {
    backendId: getBackendUserId(backendUser),
    id: backendUser.googleId ?? '',
    name: backendUser.name ?? backendUser.email ?? 'Google User',
    email: backendUser.email ?? '',
    picture: backendUser.profilePicture ?? backendUser.picture,
    contactNumber: backendUser.contactNumber ?? '',
  };
}

async function readJsonResponse(response: Response) {
  return response.json().catch(() => null);
}

function getErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === 'object') {
    const maybeError = data as { message?: unknown; error?: unknown };

    if (typeof maybeError.message === 'string') {
      return maybeError.message;
    }

    if (typeof maybeError.error === 'string') {
      return maybeError.error;
    }
  }

  return fallback;
}

export async function authenticateWithGoogle(idToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Google auth failed with status ${response.status}`));
  }

  const session = data as GoogleAuthResponse | null;

  if (!session?.token || !session.user) {
    throw new Error('Backend did not return a JWT session.');
  }

  return {
    token: session.token,
    user: mapBackendUserToAuthUser(session.user),
  };
}

export async function updateBackendUser(user: AuthUser, token: string | null, profile: Partial<AuthUser>) {
  if (!user.backendId) {
    return user;
  }

  if (!token) {
    throw new Error('You need to log in again before saving profile changes.');
  }

  const response = await fetch(`${USERS_API_URL}/${user.backendId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      googleId: user.id,
      name: profile.name ?? user.name,
      email: profile.email ?? user.email,
      profilePicture: profile.picture ?? user.picture,
      contactNumber: profile.contactNumber ?? user.contactNumber,
    }),
  });

  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, `Backend request failed with status ${response.status}`));
  }

  const backendUser = data as BackendUserResponse;

  return {
    ...user,
    ...mapBackendUserToAuthUser(backendUser),
    backendId: getBackendUserId(backendUser) ?? user.backendId,
  };
}
