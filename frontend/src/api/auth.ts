import { api } from '../patterns/proxy/ApiProxy';
import type { LoginRequest, RegisterRequest, TokenPair } from '../types/index';


export const authApi = {
  login: (data: LoginRequest) =>
    api.post<TokenPair>('/auth/login/', data),

  register: (data: RegisterRequest) =>
    api.post('/auth/register/', data),
  
  refresh: (refresh: string) =>
    api.post<TokenPair>('/auth/refresh/', {
      refresh,
    }),

  
};

