/* Admin JS - Vanilla ES6
   For demo purposes uses in-memory data and mimics async loading. */

const state = {
  messages: [],
  blocked: [],
  loading: true,
};

// Utils
const q = (s, el=document)=> el.querySelector(s);
const qa = (s, el=document)=> Array.from(el.querySelectorAll(s));

function formatDate(d){
  const date = new Date(d);
  return date.toLocaleString();
}

function showToast(text, type='success'){
  const toasts = q('#toasts');
  const el = document.createElement('div');
  el.className = `px-4 py-2 rounded-md shadow-md ${type==='error'? 'bg-red-600':'bg-accent'} text-white`;
  el.textContent = text;
  toasts.appendChild(el);
  setTimeout(()=> el.remove(), 3500);
}

function openModal(contentHtml){
  const overlay = q('#modalOverlay');
  q('#modalContent').innerHTML = contentHtml;
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
}

function closeModal(){
  const overlay = q('#modalOverlay');
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
}

function openConfirm(text, onConfirm){
  q('#confirmText').textContent = text;
  const overlay = q('#confirmOverlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  const ok = q('#confirmOk');
  const cancel = q('#confirmCancel');
  const cleanup = ()=>{ overlay.classList.add('hidden'); overlay.classList.remove('flex'); ok.removeEventListener('click', doOk); cancel.removeEventListener('click', doCancel); };
  const doOk = ()=>{ cleanup(); onConfirm(); };
  const doCancel = ()=>{ cleanup(); };
  ok.addEventListener('click', doOk);
  cancel.addEventListener('click', doCancel);
}

// Rendering
function renderCounts(){
  q('#countTotal').textContent = state.messages.length;
  q('#countUnread').textContent = state.messages.filter(m=>!m.read).length;
  q('#countRead').textContent = state.messages.filter(m=>m.read).length;
  q('#countBlocked').textContent = state.blocked.length;
}

function renderMessages(){
  const tbody = q('#messagesTbody');
  tbody.innerHTML = '';

  const filterName = q('#searchName').value.trim().toLowerCase();
  const filterEmail = q('#searchEmail').value.trim().toLowerCase();
  const status = q('#filterStatus').value;

  let list = state.messages.filter(m=>{
    if(filterName && !m.name.toLowerCase().includes(filterName)) return false;
    if(filterEmail && !m.email.toLowerCase().includes(filterEmail)) return false;
    if(status==='read' && !m.read) return false;
    if(status==='unread' && m.read) return false;
    return true;
  });

  if(list.length===0){
    tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-6 text-center text-text-secondary">Nenhuma mensagem encontrada</td></tr>`;
    return;
  }

  list.forEach(m=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3 align-top"><div class="font-semibold text-text-primary">${m.name}</div></td>
      <td class="px-4 py-3 align-top">${m.email}</td>
      <td class="px-4 py-3 align-top">${formatDate(m.date)}</td>
      <td class="px-4 py-3 align-top">${m.read? '<span class="text-sm text-text-secondary">Lida</span>':'<span class="text-sm text-accent">Não Lida</span>'}</td>
      <td class="px-4 py-3 align-top">
        <div class="flex gap-2">
          <button data-id="${m.id}" data-action="view" class="px-3 py-1 text-sm bg-transparent border border-border rounded">Visualizar</button>
          ${m.read
            ? `<button disabled aria-disabled="true" class="px-3 py-1 text-sm rounded" style="white-space: nowrap; flex-shrink: 0; background-color: #3f3f46; color: #a1a1aa; cursor: not-allowed;">Marcar como lida</button>`
            : `<button data-id="${m.id}" data-action="mark" class="px-3 py-1 text-sm bg-accent text-white rounded" style="white-space: nowrap; flex-shrink: 0;">Marcar como lida</button>`
          }
          <button data-id="${m.id}" data-action="delete" class="px-3 py-1 text-sm bg-red-600 text-white rounded">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);

    // no mobile card (we use a single responsive table)
  });
}

function renderBlocked(){
  const tb = q('#blockedTbody');
  tb.innerHTML = '';
  if(state.blocked.length===0){
    tb.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-text-secondary">Nenhum e-mail bloqueado</td></tr>`;
    return;
  }
  state.blocked.forEach(b=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-3">${b.email}</td>
      <td class="px-4 py-3">${b.reason}</td>
      <td class="px-4 py-3">${formatDate(b.date)}</td>
      <td class="px-4 py-3"><div class="flex gap-2"><button data-id="${b.id}" data-action="viewBlocked" class="px-3 py-1 border border-border rounded">Visualizar</button><button data-id="${b.id}" data-action="unblock" class="px-3 py-1 bg-accent text-white rounded">Remover</button></div></td>
    `;
    tb.appendChild(tr);
  });
}

// Events
function attachEvents(){
  q('#searchName').addEventListener('input', debounce(renderMessages, 250));
  q('#searchEmail').addEventListener('input', debounce(renderMessages, 250));
  q('#filterStatus').addEventListener('change', renderMessages);

  q('#messagesTbody').addEventListener('click', (e)=> handleTableAction(e));

  qa('.tab-btn').forEach(btn=> btn.addEventListener('click', (e)=>{
    qa('.tab-btn').forEach(b=>{
      b.classList.remove('text-accent', 'text-text-primary');
      b.classList.add('text-text-secondary');
      b.setAttribute('aria-selected', 'false');
    });
    qa('.tab-panel').forEach(p=> p.classList.add('hidden'));
    const tab = e.currentTarget.dataset.tab;
    q(`#tab-${tab}`).classList.remove('hidden');
    e.currentTarget.classList.remove('text-text-secondary');
    e.currentTarget.classList.add('text-accent');
    e.currentTarget.setAttribute('aria-selected', 'true');
  }));

  q('#modalClose').addEventListener('click', closeModal);

  q('#refreshBtn').addEventListener('click', ()=>{ loadData(); showToast('Atualizado'); });

  q('#blockForm').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const email = q('#blockEmail').value.trim();
    const reason = q('#blockReason').value.trim() || 'Sem motivo informado';
    if(!email) { showToast('Preencha o e-mail', 'error'); return; }
    state.blocked.unshift({ id: id(), email, reason, date: new Date() });
    renderBlocked(); renderCounts(); showToast('E-mail bloqueado');
    q('#blockForm').reset();
  });

  // confirm overlay close by clicking outside
  q('#confirmOverlay').addEventListener('click', (e)=>{ if(e.target===e.currentTarget) e.currentTarget.classList.add('hidden'); });
  q('#modalOverlay').addEventListener('click', (e)=>{ if(e.target===e.currentTarget) closeModal(); });
}

function handleTableAction(e){
  const btn = e.target.closest('button');
  if(!btn) return;
  const idAttr = btn.dataset.id;
  const action = btn.dataset.action;
  if(action==='view'){
    const m = state.messages.find(x=>x.id===idAttr);
    openModal(`<p class="text-sm"><strong>Nome:</strong> ${m.name}</p><p class="text-sm"><strong>E-mail:</strong> ${m.email}</p><p class="text-sm"><strong>Data:</strong> ${formatDate(m.date)}</p><p class="mt-4 text-text-secondary">${m.content}</p>`);
  }
  if(action==='mark'){
    const idx = state.messages.findIndex(x=>x.id===idAttr);
    if(idx>-1){
      if(state.messages[idx].read) return;
      state.messages[idx].read = true;
      renderMessages();
      renderCounts();
      showToast('Marcado como lida');
    }
  }
  if(action==='delete'){
    const message = state.messages.find(x=>x.id===idAttr);
    const personName = message?.name || 'esta pessoa';
    openConfirm(`Deseja excluir a mensagem de ${personName}?`, ()=>{ state.messages = state.messages.filter(x=>x.id!==idAttr); renderMessages(); renderCounts(); showToast('Mensagem excluída'); });
  }
  if(action==='viewBlocked'){
    const b = state.blocked.find(x=>x.id===idAttr);
    openModal(`<p class="text-sm"><strong>E-mail:</strong> ${b.email}</p><p class="text-sm"><strong>Motivo:</strong> ${b.reason}</p><p class="text-sm"><strong>Data:</strong> ${formatDate(b.date)}</p>`);
  }
  if(action==='unblock'){
    openConfirm('Remover bloqueio deste e-mail?', ()=>{ state.blocked = state.blocked.filter(x=>x.id!==idAttr); renderBlocked(); renderCounts(); showToast('Bloqueio removido'); });
  }
}

// Helpers
function id(){ return Math.random().toString(36).slice(2,9); }
function debounce(fn, wait=200){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

// Fake load
function loadData(){
  state.loading = true;
  // show loading skeletons (simple)
  q('#messagesTbody').innerHTML = `<tr><td colspan="5" class="px-4 py-6">Carregando...</td></tr>`;
  setTimeout(()=>{
    // sample data
    state.messages = [
      { id: id(), name: 'Maria Silva', email: 'maria@example.com', date: new Date(Date.now()-3600*1000), content: 'Olá, gostaria de saber sobre seu serviço.', read: false },
      { id: id(), name: 'João Souza', email: 'joao@example.com', date: new Date(Date.now()-86400*1000), content: 'Obrigado pelo retorno.', read: true },
      { id: id(), name: 'Empresa X', email: 'contato@empresa.com', date: new Date(Date.now()-3600*24*2*1000), content: 'Proposta comercial em anexo.', read: false },
    ];
    state.blocked = [ { id: id(), email: 'spam@bad.com', reason: 'Envio massivo', date: new Date() } ];
    state.loading = false;
    renderCounts(); renderMessages(); renderBlocked();
  }, 600);
}

// Init
document.addEventListener('DOMContentLoaded', ()=>{
  attachEvents();
  // activate first tab
  qa('.tab-btn')[0].click();
  loadData();
});
