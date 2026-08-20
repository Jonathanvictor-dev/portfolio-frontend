import { getMessages, getMessageById, markAsRead, deleteMessage } from './services/message.js';
import { getBlockedEmails, blockEmail, unblockEmail } from './services/blocked.js';
import { changePassword, logout } from './services/auth.js';

const hasToken = Boolean(localStorage.getItem('token'));

if (!hasToken) {
  window.location.replace('login.html');
};

const state = { messages: [], blockedEmails: [] };
const query = (selector) => document.querySelector(selector);
const queryAll = (selector) => Array.from(document.querySelectorAll(selector));
const elements = {
  messagesTable: query('#messagesTbody'), blockedTable: query('#blockedTbody'), searchName: query('#searchName'),
  searchEmail: query('#searchEmail'), filterStatus: query('#filterStatus'), blockForm: query('#blockForm'),
  blockEmail: query('#blockEmail'), blockReason: query('#blockReason'), modalOverlay: query('#modalOverlay'),
  modalTitle: query('#modalTitle'), modalContent: query('#modalContent'), confirmOverlay: query('#confirmOverlay'),
  confirmText: query('#confirmText'), confirmCancel: query('#confirmCancel'), confirmOk: query('#confirmOk'),
  toasts: query('#toasts'),
};

const escapeHtml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const unwrapData = (response) => response?.data ?? response;
const getList = (response) => {
  const data = unwrapData(response);
  if (Array.isArray(data)) return data;
  return data?.items ?? data?.messages ?? data?.blockedEmails ?? [];
};
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleString('pt-BR');
};
const getMessageId = (message) => message.id ?? message._id;
const getBlockedEmail = (blocked) => blocked.email ?? blocked.address;

const showToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  const colors = { success: 'bg-accent', error: 'bg-red-600', warning: 'bg-amber-500' };
  toast.className = `translate-x-full opacity-0 px-4 py-2 rounded-md shadow-md text-white transition-all duration-300 ${colors[type] || colors.success}`;
  toast.textContent = message;
  elements.toasts.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove('translate-x-full', 'opacity-0'));
  setTimeout(() => { toast.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3500);
};

const openModal = (title, content) => {
  elements.modalTitle.textContent = title;
  elements.modalTitle.classList.toggle('hidden', !title);
  elements.modalContent.innerHTML = content;
  elements.modalOverlay.classList.remove('hidden');
  elements.modalOverlay.classList.add('flex');
};

const closeModal = () => {
  elements.modalOverlay.classList.add('hidden');
  elements.modalOverlay.classList.remove('flex');
};

const showConfirm = (message) => new Promise((resolve) => {
  elements.confirmText.textContent = message;
  elements.confirmOverlay.classList.remove('hidden');
  elements.confirmOverlay.classList.add('flex');
  const finish = (result) => {
    elements.confirmOverlay.classList.add('hidden');
    elements.confirmOverlay.classList.remove('flex');
    elements.confirmOk.removeEventListener('click', confirm);
    elements.confirmCancel.removeEventListener('click', cancel);
    elements.confirmOverlay.removeEventListener('click', outsideClick);
    document.removeEventListener('keydown', escape);
    resolve(result);
  };
  const confirm = () => finish(true);
  const cancel = () => finish(false);
  const outsideClick = (event) => { if (event.target === elements.confirmOverlay) cancel(); };
  const escape = (event) => { if (event.key === 'Escape') cancel(); };
  elements.confirmOk.addEventListener('click', confirm);
  elements.confirmCancel.addEventListener('click', cancel);
  elements.confirmOverlay.addEventListener('click', outsideClick);
  document.addEventListener('keydown', escape);
});

const updateDashboard = () => {
  query('#countTotal').textContent = state.messages.length;
  query('#countUnread').textContent = state.messages.filter((message) => !message.read).length;
  query('#countRead').textContent = state.messages.filter((message) => message.read).length;
  query('#countBlocked').textContent = state.blockedEmails.length;
};

const renderMessages = () => {
  const nameFilter = elements.searchName.value.trim().toLowerCase();
  const emailFilter = elements.searchEmail.value.trim().toLowerCase();
  const statusFilter = elements.filterStatus.value;
  const messages = state.messages.filter((message) => {
    const matchesName = (message.name ?? '').toLowerCase().includes(nameFilter);
    const matchesEmail = (message.email ?? '').toLowerCase().includes(emailFilter);
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'read' && message.read) || (statusFilter === 'unread' && !message.read);
    return matchesName && matchesEmail && matchesStatus;
  });
  if (!messages.length) {
    elements.messagesTable.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-text-secondary">Nenhuma mensagem encontrada</td></tr>';
    return;
  }
  elements.messagesTable.innerHTML = messages.map((message) => {
    const id = escapeHtml(getMessageId(message));
    const readButton = message.read ? `<button data-action="view-read" data-id="${id}" aria-disabled="true" aria-label="Mensagem já lida. Exibir mensagem" style="width: 6rem; min-width: 6rem;" class="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 text-sm rounded bg-zinc-700 text-zinc-400 cursor-pointer">Ler</button>` : `<button data-action="read" data-id="${id}" style="width: 6rem; min-width: 6rem;" class="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 text-sm bg-accent text-white rounded">Ler</button>`;
    return `<tr><td class="px-4 py-3 align-top"><div class="font-semibold text-text-primary">${escapeHtml(message.name)}</div></td><td class="px-4 py-3 align-top">${escapeHtml(message.email)}</td><td class="px-4 py-3 align-top">${formatDate(message.date ?? message.createdAt)}</td><td class="px-4 py-3 align-top">${message.read ? '<span class="text-sm text-text-secondary">Lida</span>' : '<span class="text-sm text-accent">Não lida</span>'}</td><td style="width: 28rem; min-width: 28rem;" class="px-4 py-3 align-top"><div style="display: grid; grid-template-columns: 6rem 9rem 5rem; gap: 0.5rem;"><button data-action="view" data-id="${id}" style="width: 6rem;" class="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 text-sm bg-transparent border border-border rounded">Visualizar</button>${readButton}<button data-action="delete" data-id="${id}" style="width: 5rem;" class="inline-flex items-center justify-center whitespace-nowrap px-3 py-1 text-sm bg-red-600 text-white rounded">Excluir</button></div></td></tr>`;
  }).join('');
};

const renderBlockedEmails = () => {
  if (!state.blockedEmails.length) {
    elements.blockedTable.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-text-secondary">Nenhum e-mail bloqueado</td></tr>';
    return;
  };
  elements.blockedTable.innerHTML = state.blockedEmails.map((blocked) => {
    const email = getBlockedEmail(blocked);
    return `<tr><td class="px-4 py-3">${escapeHtml(email)}</td><td class="px-4 py-3">${escapeHtml(blocked.reason || 'Sem motivo informado')}</td><td class="px-4 py-3">${formatDate(blocked.date ?? blocked.createdAt)}</td><td class="px-4 py-3"><button data-action="unblock" data-email="${escapeHtml(email)}" class="px-3 py-1 bg-accent text-white rounded">Remover</button></td></tr>`;
  }).join('');
};

const loadMessages = async () => {
  try {
    state.messages = getList(await getMessages());
    renderMessages();
    updateDashboard();
  } catch (error) {
    state.messages = [];
    renderMessages();
    updateDashboard();
    showToast(error.message || 'Não foi possível carregar as mensagens.', 'error');
  };
};

const loadBlockedEmails = async () => {
  try {
    state.blockedEmails = getList(await getBlockedEmails());
    renderBlockedEmails();
    updateDashboard();
  } catch (error) {
    state.blockedEmails = [];
    renderBlockedEmails();
    updateDashboard();
    showToast(error.message || 'Não foi possível carregar os e-mails bloqueados.', 'error');
  }
};

const refreshData = async () => {
  await Promise.all([loadMessages(), loadBlockedEmails()]);
  showToast('Dados atualizados.');
};

const handleMessageAction = async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  try {
    if (action === 'view') {
      const message = unwrapData(await getMessageById(id));
      openModal('Detalhes da mensagem', `<p class="text-sm"><strong>Nome:</strong> ${escapeHtml(message.name)}</p><p class="text-sm"><strong>E-mail:</strong> ${escapeHtml(message.email)}</p><p class="text-sm"><strong>Data:</strong> ${formatDate(message.date ?? message.createdAt)}</p><p class="mt-4 text-text-secondary whitespace-pre-wrap">${escapeHtml(message.content)}</p>`);
      return;
    }
    if (action === 'view-read') {
      openModal('Atenção!', '<p class="text-text-secondary">Esta mensagem já foi marcada como lida.</p>');
      return;
    }
    if (action === 'read') {
      await markAsRead(id);
      const message = state.messages.find((item) => String(getMessageId(item)) === String(id));
      if (message) message.read = true;
      renderMessages();
      updateDashboard();
      showToast('Mensagem marcada como lida.');
      return;
    }
    if (action === 'delete' && await showConfirm('Deseja excluir esta mensagem?')) {
      await deleteMessage(id);
      state.messages = state.messages.filter((message) => String(getMessageId(message)) !== String(id));
      renderMessages();
      updateDashboard();
      showToast('Mensagem excluída.');
    }
  } catch (error) {
    showToast(error.message || 'Não foi possível concluir a ação.', 'error');
  }
};

const handleUnblock = async (event) => {
  const button = event.target.closest('button[data-action="unblock"]');
  if (!button || !await showConfirm(`Deseja desbloquear ${button.dataset.email}?`)) return;
  try {
    await unblockEmail(button.dataset.email);
    state.blockedEmails = state.blockedEmails.filter((blocked) => getBlockedEmail(blocked) !== button.dataset.email);
    renderBlockedEmails();
    updateDashboard();
    showToast('E-mail desbloqueado.');
  } catch (error) {
    showToast(error.message || 'Não foi possível desbloquear o e-mail.', 'error');
  }
};

const handleBlockSubmit = async (event) => {
  event.preventDefault();
  const email = elements.blockEmail.value.trim();
  const reason = elements.blockReason.value.trim();
  if (!email) {
    showToast('Preencha o e-mail.', 'warning');
    elements.blockEmail.focus();
    return;
  }
  if (!elements.blockEmail.checkValidity()) {
    showToast('Informe um e-mail válido.', 'warning');
    elements.blockEmail.focus();
    return;
  }
  try {
    await blockEmail({ email, reason: reason || 'Sem motivo informado' });
    elements.blockForm.reset();
    await loadBlockedEmails();
    showToast('E-mail bloqueado.');
  } catch (error) {
    showToast(error.message || 'Não foi possível bloquear o e-mail.', 'error');
  }
};

const setupTabs = () => {
  queryAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      queryAll('.tab-btn').forEach((tab) => {
        const active = tab === button;
        tab.classList.toggle('text-accent', active);
        tab.classList.toggle('text-text-secondary', !active);
        tab.setAttribute('aria-selected', String(active));
      });
      queryAll('.tab-panel').forEach((panel) => panel.classList.toggle('hidden', panel.id !== `tab-${button.dataset.tab}`));
    });
  });
};

const setupEvents = () => {
  query('#change-password')?.addEventListener('click', (event) => {
    event.preventDefault();
    openModal('Alterar senha', `
      <form id="change-password-form" class="space-y-4">
        <div>
          <label for="current-password" class="text-sm font-medium text-text-primary">Senha atual</label>
          <input id="current-password" name="currentPassword" type="password" required class="mt-2 w-full px-4 py-3 rounded-lg bg-background border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40">
        </div>
        <div>
          <label for="new-password" class="text-sm font-medium text-text-primary">Nova senha</label>
          <input id="new-password" name="newPassword" type="password" minlength="6" required class="mt-2 w-full px-4 py-3 rounded-lg bg-background border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40">
        </div>
        <div>
          <label for="confirm-password" class="text-sm font-medium text-text-primary">Confirmar nova senha</label>
          <input id="confirm-password" name="confirmPassword" type="password" minlength="6" required class="mt-2 w-full px-4 py-3 rounded-lg bg-background border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40">
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" id="change-password-cancel" class="px-4 py-2 bg-background border border-border rounded-md text-text-secondary">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-accent text-white rounded-md">Salvar senha</button>
        </div>
      </form>
    `);

    query('#change-password-cancel').addEventListener('click', closeModal);
    query('#change-password-form').addEventListener('submit', handleChangePassword);
  });

  query('#logout')?.addEventListener('click', async (event) => {
    event.preventDefault();

    if (!await showConfirm('Deseja realmente sair do painel administrativo?')) return;

    try {
      await logout();
    } catch (error) {
      showToast(error.message || 'Não foi possível encerrar a sessão.', 'error');
    } finally {
      localStorage.removeItem('token');
      window.location.replace('login.html');
    }
  });

  elements.searchName.addEventListener('input', renderMessages);
  elements.searchEmail.addEventListener('input', renderMessages);
  elements.filterStatus.addEventListener('change', renderMessages);
  elements.messagesTable.addEventListener('click', handleMessageAction);
  elements.blockedTable.addEventListener('click', handleUnblock);
  elements.blockForm.addEventListener('submit', handleBlockSubmit);
  query('#refreshBtn').addEventListener('click', refreshData);
  query('#modalClose').addEventListener('click', closeModal);
  elements.modalOverlay.addEventListener('click', (event) => { if (event.target === elements.modalOverlay) closeModal(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
};

const handleChangePassword = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const currentPassword = form.currentPassword.value;
  const newPassword = form.newPassword.value;
  const confirmPassword = form.confirmPassword.value;

  if (newPassword !== confirmPassword) {
    showToast('A confirmação da nova senha não confere.', 'warning');
    form.confirmPassword.focus();
    return;
  }

  try {
    await changePassword({ currentPassword, newPassword });
    closeModal();
    showToast('Senha alterada com sucesso.');
  } catch (error) {
    showToast(error.message || 'Não foi possível alterar a senha.', 'error');
  }
};

const initialize = async () => {
  if (!hasToken) return;

  setupTabs();
  setupEvents();
  query('.tab-btn')?.click();
  await Promise.all([loadMessages(), loadBlockedEmails()]);
};

document.addEventListener('DOMContentLoaded', initialize);