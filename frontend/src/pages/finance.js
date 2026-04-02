// ── COUNSELING PAGE ───────────────────────────────────────────────────────
async function renderCounseling(container, actions) {
  try {
    const leads = await api('GET', '/leads?stage=counseling');
    container.innerHTML = `
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">⌕</span>
          <input type="text" id="c-search" placeholder="Search candidates…">
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('counseling')">↺ Refresh</button>
      </div>
      <div class="card">
        <div class="card-header">
          <h4>◉ Counseling Queue</h4>
          <span class="sub">${leads.length} candidates</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Candidate</th><th>Phone</th><th>Destination</th><th>Status</th><th>Sessions</th><th>Created</th><th></th></tr>
            </thead>
            <tbody>
              ${leads.length ? leads.map(l => `
                <tr>
                  <td class="td-name">${l.name}</td>
                  <td class="td-phone">${l.phone}</td>
                  <td>${l.destination || '—'}</td>
                  <td>${statusBadge(l.status)}</td>
                  <td><span style="font-family:var(--mono);font-size:12px">—</span></td>
                  <td style="font-size:11px;font-family:var(--mono);color:var(--text3)">${fmtDate(l.created_at)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="openLeadDetail('${l.id}')">View</button>
                    <button class="btn btn-sm btn-primary" onclick="openAddSessionModal('${l.id}')" style="margin-left:4px">＋ Session</button>
                  </td>
                </tr>`).join('')
              : '<tr><td colspan="7"><div class="empty-state"><div class="icon">◉</div><p>No leads in counseling queue</p></div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    // search filter
    let timer;
    container.querySelector('#c-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      clearTimeout(timer);
      timer = setTimeout(() => {
        container.querySelectorAll('tbody tr').forEach(tr => {
          const text = tr.textContent.toLowerCase();
          tr.style.display = text.includes(q) ? '' : 'none';
        });
      }, 200);
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

// ── ADD SESSION MODAL ─────────────────────────────────────────────────────
function openAddSessionModal(leadId) {
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>◉ Log Counseling Session</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Sitting Status *</label>
          <select class="form-control" id="sitting-status">
            <option>Sitting 1 Completed</option>
            <option>Sitting 2 Completed</option>
            <option>Sitting 3 Completed</option>
            <option>Documents Pending</option>
            <option>Documents Received</option>
            <option>Follow Up</option>
            <option>Not Responding</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Session Notes</label>
          <textarea class="form-control" id="session-notes" rows="4" placeholder="What was discussed? Any action items?"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitAddSession('${leadId}')">Log Session</button>
      </div>
    </div>`);
}

async function submitAddSession(leadId) {
  const sitting_status = document.getElementById('sitting-status').value;
  const notes = document.getElementById('session-notes').value.trim();
  try {
    await api('POST', `/leads/${leadId}/sessions`, { sitting_status, notes });
    toast('Session logged!', 'success');
    closeModal();
    openLeadDetail(leadId);
  } catch (e) { toast(e.message, 'error'); }
}

// ── COMPLETE COUNSELING MODAL ─────────────────────────────────────────────
function openCompleteCounselingModal(leadId) {
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>✓ Complete Counseling</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.25);border-radius:var(--radius);padding:16px;margin-bottom:16px">
          <p style="color:var(--text);font-size:14px">Marking counseling as <strong>Complete</strong> will push this candidate to the <strong>Accounts Department</strong> for payment collection.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Final Note</label>
          <textarea class="form-control" id="complete-note" rows="3" placeholder="Summary or final remarks…"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-success" onclick="submitCompleteCounseling('${leadId}')">✓ Mark Complete & Send to Accounts</button>
      </div>
    </div>`);
}

async function submitCompleteCounseling(leadId) {
  const note = document.getElementById('complete-note').value.trim();
  try {
    await api('PUT', `/leads/${leadId}/complete-counseling`, { note });
    toast('Lead moved to Accounts!', 'success');
    closeModal();
    navigate('counseling');
  } catch (e) { toast(e.message, 'error'); }
}

// ── ACCOUNTS PAGE ─────────────────────────────────────────────────────────
async function renderAccounts(container, actions) {
  try {
    const leads = await api('GET', '/leads?stage=accounts');
    container.innerHTML = `
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">⌕</span>
          <input type="text" id="a-search" placeholder="Search candidates…">
        </div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('accounts')">↺ Refresh</button>
      </div>
      <div class="card">
        <div class="card-header">
          <h4>◎ Accounts — Pending Payment</h4>
          <span class="sub">${leads.length} candidates</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Candidate</th><th>Phone</th><th>Destination</th><th>Visa</th><th>Counselor</th><th>Date</th><th></th></tr>
            </thead>
            <tbody>
              ${leads.length ? leads.map(l => `
                <tr>
                  <td class="td-name">${l.name}</td>
                  <td class="td-phone">${l.phone}</td>
                  <td>${l.destination || '—'}</td>
                  <td>${l.visa_type || '—'}</td>
                  <td>${l.counselor_name || '—'}</td>
                  <td style="font-size:11px;font-family:var(--mono);color:var(--text3)">${fmtDate(l.updated_at)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary" onclick="openLeadDetail('${l.id}')">View</button>
                    <button class="btn btn-sm btn-success" onclick="openAddPaymentModal('${l.id}')" style="margin-left:4px">＋ Payment</button>
                  </td>
                </tr>`).join('')
              : '<tr><td colspan="7"><div class="empty-state"><div class="icon">◎</div><p>No candidates pending payment</p></div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;

    let timer;
    container.querySelector('#a-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      clearTimeout(timer);
      timer = setTimeout(() => {
        container.querySelectorAll('tbody tr').forEach(tr => {
          tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      }, 200);
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

// ── ADD PAYMENT MODAL ─────────────────────────────────────────────────────
function openAddPaymentModal(leadId) {
  const today = new Date().toISOString().split('T')[0];
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>💳 Record Payment</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Amount (₹) *</label>
            <input class="form-control" id="pay-amount" type="number" placeholder="0.00" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">Payment Mode *</label>
            <select class="form-control" id="pay-mode">
              <option>Cash</option><option>Cheque</option><option>Bank Transfer</option>
              <option>UPI</option><option>NEFT</option><option>RTGS</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Payment Date *</label>
          <input class="form-control" id="pay-date" type="date" value="${today}">
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="pay-notes" rows="2" placeholder="Reference number, remarks…"></textarea>
        </div>
        <div style="background:rgba(79,142,247,0.08);border:1px solid rgba(79,142,247,0.2);border-radius:var(--radius);padding:12px;font-size:12px;color:var(--text2)">
          ℹ Recording payment will automatically mark this candidate as <strong>Completed</strong>.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-success" id="pay-btn" onclick="submitAddPayment('${leadId}')">✓ Record Payment</button>
      </div>
    </div>`);
}

async function submitAddPayment(leadId) {
  const amount = document.getElementById('pay-amount').value;
  const payment_mode = document.getElementById('pay-mode').value;
  const payment_date = document.getElementById('pay-date').value;
  const notes = document.getElementById('pay-notes').value.trim();
  if (!amount || parseFloat(amount) <= 0) return toast('Enter a valid amount', 'error');
  const btn = document.getElementById('pay-btn');
  btn.disabled = true; btn.textContent = 'Recording…';
  try {
    const result = await api('POST', `/leads/${leadId}/payments`, { amount, payment_mode, payment_date, notes });
    // Auto-create cheque if mode is Cheque
    toast('Payment recorded! Candidate marked as Completed.', 'success');
    closeModal();
    navigate('accounts');
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false; btn.textContent = '✓ Record Payment';
  }
}

// ── ADD CHEQUE MODAL ──────────────────────────────────────────────────────
function openAddChequeModal(leadId) {
  const today = new Date().toISOString().split('T')[0];
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>▣ Record Cheque</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Cheque Number *</label>
            <input class="form-control" id="chq-num" placeholder="e.g. 000123">
          </div>
          <div class="form-group">
            <label class="form-label">Bank Name *</label>
            <input class="form-control" id="chq-bank" placeholder="e.g. State Bank of India">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Amount (₹) *</label>
            <input class="form-control" id="chq-amount" type="number" placeholder="0.00">
          </div>
          <div class="form-group">
            <label class="form-label">Issue Date *</label>
            <input class="form-control" id="chq-date" type="date" value="${today}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="chq-notes" rows="2" placeholder="Additional remarks…"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitAddCheque('${leadId}')">▣ Record Cheque</button>
      </div>
    </div>`);
}

async function submitAddCheque(leadId) {
  const cheque_number = document.getElementById('chq-num').value.trim();
  const bank_name = document.getElementById('chq-bank').value.trim();
  const amount = document.getElementById('chq-amount').value;
  const issue_date = document.getElementById('chq-date').value;
  const notes = document.getElementById('chq-notes').value.trim();
  if (!cheque_number || !bank_name || !amount) return toast('Fill required fields', 'error');
  try {
    await api('POST', `/leads/${leadId}/cheques`, { cheque_number, bank_name, amount, issue_date, notes });
    toast('Cheque recorded!', 'success');
    closeModal();
    openLeadDetail(leadId);
  } catch (e) { toast(e.message, 'error'); }
}

// ── UPDATE CHEQUE STATUS ──────────────────────────────────────────────────
function openUpdateChequeModal(chequeId, currentStatus) {
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>▣ Update Cheque Status</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Status</label>
          <select class="form-control" id="chq-status">
            <option ${currentStatus==='Pending'?'selected':''}>Pending</option>
            <option ${currentStatus==='Issued'?'selected':''}>Issued</option>
            <option ${currentStatus==='Cleared'?'selected':''}>Cleared</option>
            <option ${currentStatus==='Bounced'?'selected':''}>Bounced</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="chq-update-notes" rows="2" placeholder="Reason for status change…"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitUpdateCheque('${chequeId}')">Update</button>
      </div>
    </div>`);
}

async function submitUpdateCheque(chequeId) {
  const status = document.getElementById('chq-status').value;
  const notes = document.getElementById('chq-update-notes').value.trim();
  try {
    await api('PUT', `/cheques/${chequeId}`, { status, notes });
    toast('Cheque status updated!', 'success');
    closeModal();
    navigate('cheques');
  } catch (e) { toast(e.message, 'error'); }
}

// ── CHEQUES PAGE ──────────────────────────────────────────────────────────
async function renderCheques(container, actions) {
  try {
    const leads = await api('GET', '/leads?_all=1');
    const allCheques = [];
    // Fetch cheques via leads that have been to accounts
    const accountLeads = leads.filter(l => ['accounts','completed'].includes(l.stage));

    for (const lead of accountLeads) {
      try {
        const cheques = await api('GET', `/leads/${lead.id}/cheques`);
        cheques.forEach(c => { c._lead_name = lead.name; c._lead_phone = lead.phone; });
        allCheques.push(...cheques);
      } catch {}
    }

    container.innerHTML = `
      <div class="search-bar">
        <select class="filter-select" id="chq-filter">
          <option value="">All Statuses</option>
          <option>Pending</option><option>Issued</option><option>Cleared</option><option>Bounced</option>
        </select>
        <button class="btn btn-secondary btn-sm" onclick="navigate('cheques')">↺ Refresh</button>
      </div>
      <div class="card">
        <div class="card-header">
          <h4>▣ Cheque Register</h4>
          <span class="sub">${allCheques.length} total</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Cheque #</th><th>Candidate</th><th>Bank</th><th>Amount</th><th>Issue Date</th><th>Status</th><th></th></tr>
            </thead>
            <tbody id="cheque-tbody">
              ${renderChequeRows(allCheques)}
            </tbody>
          </table>
        </div>
      </div>`;

    container.querySelector('#chq-filter').addEventListener('change', e => {
      const f = e.target.value;
      container.querySelectorAll('#cheque-tbody tr').forEach(tr => {
        tr.style.display = !f || tr.dataset.status === f ? '' : 'none';
      });
    });
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

function renderChequeRows(cheques) {
  if (!cheques.length) return '<tr><td colspan="7"><div class="empty-state"><div class="icon">▣</div><p>No cheques recorded</p></div></td></tr>';
  return cheques.map(c => `
    <tr data-status="${c.status}">
      <td><span class="mono" style="font-weight:600">#${c.cheque_number}</span></td>
      <td class="td-name">${c._lead_name || '—'}</td>
      <td>${c.bank_name}</td>
      <td><span class="mono text-green" style="font-weight:700">${fmtMoney(c.amount)}</span></td>
      <td style="font-family:var(--mono);font-size:12px;color:var(--text3)">${fmtDate(c.issue_date)}</td>
      <td>${chequeBadge(c.status)}</td>
      <td>${c.status !== 'Cleared' && c.status !== 'Bounced' ?
        `<button class="btn btn-sm btn-secondary" onclick="openUpdateChequeModal('${c.id}','${c.status}')">Update</button>` : ''}</td>
    </tr>`).join('');
}

// ── USERS PAGE ────────────────────────────────────────────────────────────
async function renderUsers(container, actions) {
  actions.innerHTML = `<button class="btn btn-primary" onclick="openCreateUserModal()">＋ Add User</button>`;
  try {
    const users = await api('GET', '/users');
    container.innerHTML = `
      <div class="card">
        <div class="card-header"><h4>◫ User Management</h4><span class="sub">${users.length} users</span></div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th></tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      ${avatar(u.name, u.role)}
                      <span style="font-weight:500;color:var(--text)">${u.name}</span>
                    </div>
                  </td>
                  <td style="font-family:var(--mono);font-size:12px;color:var(--text3)">${u.email}</td>
                  <td>
                    <span style="background:${roleColors[u.role]}22;color:${roleColors[u.role]};border:1px solid ${roleColors[u.role]}44;padding:3px 10px;border-radius:4px;font-size:11px;font-family:var(--mono);font-weight:600">
                      ${roleLabels[u.role]}
                    </span>
                  </td>
                  <td style="font-size:11px;font-family:var(--mono);color:var(--text3)">${fmtDate(u.created_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

function openCreateUserModal() {
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>◫ Add New User</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <input class="form-control" id="u-name" placeholder="John Smith">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email *</label>
            <input class="form-control" id="u-email" type="email" placeholder="user@company.com">
          </div>
          <div class="form-group">
            <label class="form-label">Role *</label>
            <select class="form-control" id="u-role">
              <option value="telecaller">Tele-Caller</option>
              <option value="counselor">Counselor</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Password *</label>
          <input class="form-control" id="u-pass" type="password" placeholder="Min 6 characters">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="create-user-btn" onclick="submitCreateUser()">＋ Create User</button>
      </div>
    </div>`);
}

async function submitCreateUser() {
  const name = document.getElementById('u-name').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const role = document.getElementById('u-role').value;
  const password = document.getElementById('u-pass').value;
  if (!name || !email || !password) return toast('All fields are required', 'error');
  const btn = document.getElementById('create-user-btn');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    await api('POST', '/users', { name, email, role, password });
    toast('User created!', 'success');
    closeModal();
    navigate('users');
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false; btn.textContent = '＋ Create User';
  }
}

// ── REPORTS PAGE ──────────────────────────────────────────────────────────
async function renderReports(container, actions) {
  try {
    const [data, leads] = await Promise.all([
      api('GET', '/dashboard'),
      api('GET', '/leads')
    ]);

    const completed = leads.filter(l => l.stage === 'completed');
    const counseling = leads.filter(l => l.stage === 'counseling');
    const inLead = leads.filter(l => l.stage === 'lead');
    const convRate = leads.length ? Math.round(completed.length / leads.length * 100) : 0;

    // Group by destination
    const byDest = {};
    leads.forEach(l => { const d = l.destination || 'Unknown'; byDest[d] = (byDest[d] || 0) + 1; });
    const destEntries = Object.entries(byDest).sort((a, b) => b[1] - a[1]).slice(0, 6);

    // Group by month
    const byMonth = {};
    leads.forEach(l => {
      const m = l.created_at?.slice(0, 7) || 'Unknown';
      byMonth[m] = (byMonth[m] || 0) + 1;
    });
    const monthEntries = Object.entries(byMonth).sort().slice(-6);

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card blue"><div class="stat-label">Total Leads</div><div class="stat-value">${leads.length}</div></div>
        <div class="stat-card green"><div class="stat-label">Conversion Rate</div><div class="stat-value">${convRate}%</div><div class="stat-sub">${completed.length} completed</div></div>
        <div class="stat-card yellow"><div class="stat-label">In Pipeline</div><div class="stat-value">${counseling.length + inLead.length}</div></div>
        <div class="stat-card teal"><div class="stat-label">Total Revenue</div><div class="stat-value" style="font-size:18px">${fmtMoney(data.total_payments)}</div></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header"><h4>🌍 Leads by Destination</h4></div>
          <div class="card-body">
            ${destEntries.map(([dest, cnt]) => {
              const pct = Math.round(cnt / leads.length * 100);
              return `<div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-size:13px;color:var(--text)">${dest}</span>
                  <span style="font-family:var(--mono);font-size:12px;color:var(--text3)">${cnt} (${pct}%)</span>
                </div>
                <div style="height:8px;background:var(--bg4);border-radius:4px;overflow:hidden">
                  <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,var(--accent),var(--teal));border-radius:4px;transition:width 0.6s ease"></div>
                </div>
              </div>`;
            }).join('') || '<p class="text-muted">No data</p>'}
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h4>📅 Monthly Lead Volume</h4></div>
          <div class="card-body">
            ${monthEntries.length ? (() => {
              const max = Math.max(...monthEntries.map(e => e[1]));
              return monthEntries.map(([month, cnt]) => {
                const pct = Math.round(cnt / max * 100);
                return `<div style="margin-bottom:12px">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                    <span style="font-size:13px;color:var(--text);font-family:var(--mono)">${month}</span>
                    <span style="font-family:var(--mono);font-size:12px;color:var(--text3)">${cnt}</span>
                  </div>
                  <div style="height:8px;background:var(--bg4);border-radius:4px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:var(--purple);border-radius:4px"></div>
                  </div>
                </div>`;
              }).join('');
            })() : '<p class="text-muted">No data</p>'}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:20px">
        <div class="card-header"><h4>📋 Stage Conversion Funnel</h4></div>
        <div class="card-body">
          ${[
            ['Lead Stage', leads.length, 'var(--accent)'],
            ['Counseling', leads.length - inLead.length, 'var(--purple)'],
            ['Accounts', leads.length - inLead.length - counseling.length, 'var(--teal)'],
            ['Completed', completed.length, 'var(--green)']
          ].map(([label, cnt, color]) => {
            const pct = leads.length ? Math.round(cnt / leads.length * 100) : 0;
            return `<div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">
              <div style="width:130px;font-size:13px;color:var(--text2)">${label}</div>
              <div style="flex:1;height:10px;background:var(--bg4);border-radius:5px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${color};border-radius:5px"></div>
              </div>
              <span style="font-family:var(--mono);font-size:12px;color:var(--text3);width:60px;text-align:right">${cnt} (${pct}%)</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}
