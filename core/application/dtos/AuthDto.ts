export interface LoginRequestDto {
  phone?: string;
  facebookId?: string;
  password: string;
}

export interface LoginResponseDto {
  access_token?: string;
  token?: string;
  accessToken?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string | null;
    role?: string;
  };
}

export interface RegisterRequestDto {
  name: string;
  email: string;
  password: string;
}
