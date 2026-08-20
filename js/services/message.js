import { request } from '../api/request.js';

export const createMessage = (message) =>
    request('/messages', {
        method: 'POST',
        body: message,
    });

export const getMessages = () =>
    request('/messages');

export const getMessageById = (id) =>
    request(`/messages/${id}`);

export const markAsRead = (id) =>
    request(`/messages/${id}/read`, {
        method: 'PATCH',
    });

export const deleteMessage = (id) =>
    request(`/messages/${id}`, {
        method: 'DELETE',
    });