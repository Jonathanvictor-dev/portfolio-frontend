import { request } from '../api/request.js';

export const login = (credentials) =>
    request('/auth/login', {
        method: 'POST',
        body: credentials,
    });

export const logout = () =>
    request('/auth/logout', {
        method: 'POST',
    });

export const changePassword = (passwords) =>
    request('/auth/password', {
        method: 'PATCH',
        body: passwords,
    });