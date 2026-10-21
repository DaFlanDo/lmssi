import api from './api';

export interface User {
  id: number;
  identification_number: string;
  full_name: string;
  role: 'admin' | 'hr' | 'student';
  group_id?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  identification_number: string;
  full_name: string;
  password: string;
  group_id?: number;
}

export interface LoginData {
  identification_number: string;
  password: string;
}

class AuthService {
  private readonly TOKEN_KEY = 'lms_token';
  private readonly USER_KEY = 'lms_user';

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    this.setAuth(response.access_token, response.user);
    return response;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    this.setAuth(response.access_token, response.user);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return await api.get<User>('/auth/me');
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    window.location.href = '/login';
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  private setAuth(token: string, user: User): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }
}

export const authService = new AuthService();
