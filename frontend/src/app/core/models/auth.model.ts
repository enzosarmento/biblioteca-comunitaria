export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: string;
  username: string;
  role: string;
}

export interface SessionUser {
  username: string;
  role: string;
}

