const API_URL = 'http://localhost:3004';

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

  if (!response.ok) {
    throw new Error(data.message || 'Erro na requisição');
  };

  return data;
};