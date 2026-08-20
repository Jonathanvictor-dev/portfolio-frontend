import { request } from "../api/request.js";

export const getBlockedEmails = () =>
  request('/blocked-emails');

export const blockEmail = (data) =>
  request('/blocked-emails', {
    method: 'POST',
    body: data,
  });

export const unblockEmail = (email) =>
  request(`/blocked-emails/${email}`, {
    method: 'DELETE',
  });