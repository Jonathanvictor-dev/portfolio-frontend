const API_URL =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1'
    ? 'http://localhost:3004'
    : 'https://portfolio-contato-api-production.up.railway.app';

export const request = async (endpoint, { method = 'GET', body, headers = {} } = {}) => {
  const token = localStorage.getItem('token');

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && {
          Authorization: `Bearer ${token}`,
        }),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    },
  );

  if (response.status === 204) {
    return null;
  };

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
    return;
  }

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  };

  return data;
};