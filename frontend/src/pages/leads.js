// ── DASHBOARD ──────────────────────────────────────────────────────────────
async function renderDashboard(container, actions) {
  try {
    const data = await api('GET', '/dashboard');
    const role = state.user.role;
    let html = '';

    if (role === 'admin') {
      html = `
        <div class="stats-grid">
          <div class="stat-card blue">
            <div class="stat-label">Total Leads</div>
            <div class="stat-value">${data.total_leads || 0}</div>
            <div class="stat-sub">${data.leads_today || 0} added today</div>
          </div>
          <div class="stat-card green">
            <div class="stat-label">In Counseling</div>
            <div class="stat-value">${data.by_stage?.counseling || 0}</div>
            <div class="stat-sub">Awaiting counselor</div>
          </div>
          <div class="stat-card teal">
            <div class="stat-label">In Accounts</div>
            <div class="stat-value">${data.by_stage?.accounts || 0}</div>
            <div class="stat-sub">Awaiting payment</div>
          </div>
          <div class="stat-card yellow">
            <div class="stat-label">Completed</div>
            <div class="stat-value">${data.by_stage?.completed || 0}</div>
            <div class="stat-sub">Fully processed</div>
          </div>
          <div class="stat-card green">
            <div class="stat-label">Total Received</div>
            <div class="stat-value" style="font-size:20px">${fmtMoney(data.total_payments)}</div>
            <div class="stat-sub">All payments</div>
          </div>
          <div class="stat-card red">
            <div class="stat-label">Pending Cheques</div>
            <div class="stat-value">${data.pending_cheques || 0}</div>
            <div class="stat-sub">Awaiting clearance</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div class="card">
            <div class="card-header"><h4>📊 Leads by Status</h4></div>
            <div class="card-body">
              ${Object.entries(data.by_status || {}).map(([s, c]) =>
                `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                  ${statusBadge(s)}
                  <div style="flex:1;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden">
                    <div style="height:100%;width:${Math.round(c/data.total_leads*100)}%;background:var(--accent);border-radius:3px"></div>
                  </div>
                  <span class="mono text-muted" style="font-size:12px">${c}</span>
                </div>`
              ).join('')}
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h4>🕐 Recent Leads</h4></div>
            <div class="card-body" style="padding:0">
              ${(data.recent_leads || []).map(l => `
                <div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;cursor:pointer" onclick="openLeadDetail('${l.id}')">
                  <div>
                    <div style="font-weight:500;color:var(--text)">${escapeHTML(l.name)}</div>
                    <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">${escapeHTML(l.phone)}</div>
                  </div>
                  <div style="margin-left:auto">${stageBadge(l.stage)}</div>
                </div>`).join('') || '<div class="empty-state"><p>No leads yet</p></div>'}
            </div>
          </div>
        </div>`;

    } else if (role === 'telecaller') {
      html = `
        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-label">My Leads</div><div class="stat-value">${data.my_leads||0}</div><div class="stat-sub">Total assigned</div></div>
          <div class="stat-card yellow"><div class="stat-label">Pending</div><div class="stat-value">${data.pending||0}</div><div class="stat-sub">Need action</div></div>
          <div class="stat-card green"><div class="stat-label">Interested</div><div class="stat-value">${data.interested||0}</div><div class="stat-sub">Ready for counseling</div></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>📊 My Leads by Status</h4></div>
          <div class="card-body">
            ${Object.entries(data.by_status || {}).map(([s, c]) =>
              `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
                ${statusBadge(s)}
                <div style="flex:1;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden">
                  <div style="height:100%;width:${Math.round(c/(data.my_leads||1)*100)}%;background:var(--accent);border-radius:3px"></div>
                </div>
                <span class="mono text-muted" style="font-size:12px">${c}</span>
              </div>`
            ).join('') || '<p class="text-muted">No data yet</p>'}
          </div>
        </div>`;

    } else if (role === 'counselor') {
      html = `
        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-label">New to Counsel</div><div class="stat-value">${data.new_leads||0}</div><div class="stat-sub">Awaiting first session</div></div>
          <div class="stat-card yellow"><div class="stat-label">In Progress</div><div class="stat-value">${data.in_progress||0}</div><div class="stat-sub">Sessions ongoing</div></div>
          <div class="stat-card green"><div class="stat-label">Sent to Accounts</div><div class="stat-value">${data.completed||0}</div><div class="stat-sub">Counseling done</div></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>💡 Quick Action</h4></div>
          <div class="card-body">
            <p style="color:var(--text2);margin-bottom:16px">You have <strong style="color:var(--accent)">${data.new_leads||0}</strong> new leads waiting for counseling sessions.</p>
            <button class="btn btn-primary" onclick="navigate('counseling')">◉ Go to Counseling Queue →</button>
          </div>
        </div>`;

    } else if (role === 'accountant') {
      const cq = data.cheques_by_status || {};
      html = `
        <div class="stats-grid">
          <div class="stat-card yellow"><div class="stat-label">Pending Accounts</div><div class="stat-value">${data.pending_accounts||0}</div><div class="stat-sub">Waiting for payment</div></div>
          <div class="stat-card green"><div class="stat-label">Total Received</div><div class="stat-value" style="font-size:20px">${fmtMoney(data.total_received)}</div><div class="stat-sub">All payments</div></div>
          <div class="stat-card blue"><div class="stat-label">Completed</div><div class="stat-value">${data.completed||0}</div><div class="stat-sub">Fully settled</div></div>
        </div>
        <div class="card">
          <div class="card-header"><h4>▣ Cheque Status Overview</h4></div>
          <div class="card-body">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${['Pending','Issued','Cleared','Bounced'].map(s => `
                <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px">
                  ${chequeBadge(s)}
                  <div style="font-size:22px;font-weight:700;font-family:var(--mono);color:var(--text);margin-top:8px">${cq[s]||0}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>`;
    }

    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠</div><p>${e.message}</p></div>`;
  }
}

// ── ALL LEADS (Admin) ───────────────────────────────────────────────────────
async function renderLeads(container, actions) {
  actions.innerHTML = `
    <button class="btn btn-secondary" onclick="downloadExportCSV()">📥 Export CSV</button>
    <button class="btn btn-secondary" onclick="document.getElementById('csv-upload').click()">📂 Import CSV</button>
    <input type="file" id="csv-upload" accept=".csv" style="display:none" onchange="handleCSVUpload(event)">
    <button class="btn btn-primary" onclick="openCreateLeadModal()">＋ New Lead</button>`;
  await renderLeadsTable(container, '/leads');
}

async function downloadExportCSV() {
  try {
    const res = await fetch(API + '/leads/export', {
       headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) throw new Error('Failed to export');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = 'leads_export.csv'; 
    a.click();
  } catch (e) { toast(e.message, 'error'); }
}

// ── MY LEADS (Telecaller) ───────────────────────────────────────────────────
async function renderMyLeads(container, actions) {
  await renderLeadsTable(container, '/leads');
}

async function renderLeadsTable(container, path, extraParams = '') {
  let search = '';
  let stageFilter = '';
  let statusFilter = '';

  async function load() {
    let url = `${path}?q=1`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (stageFilter) url += `&stage=${stageFilter}`;
    if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
    url += extraParams;

    try {
      const leads = await api('GET', url);
      renderTable(leads);
    } catch (e) {
      container.querySelector('#leads-table-body').innerHTML =
        `<tr><td colspan="8" class="text-muted" style="text-align:center;padding:32px">${e.message}</td></tr>`;
    }
  }

  function renderTable(leads) {
    const role = state.user.role;
    const tbody = container.querySelector('#leads-table-body');
    if (!leads.length) {
      tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="icon">◈</div><p>No leads found</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = leads.map(l => `
      <tr>
        <td class="td-name">${escapeHTML(l.name)}</td>
        <td class="td-phone">${escapeHTML(l.phone)}</td>
        <td>${escapeHTML(l.destination) || '—'}</td>
        <td>${stageBadge(l.stage)}</td>
        <td>${statusBadge(l.status)}</td>
        <td>${l.telecaller_name || '—'}</td>
        <td class="text-muted" style="font-size:11px;font-family:var(--mono)">${fmtDate(l.created_at)}</td>
        <td class="td-action">
          <button class="btn btn-sm btn-secondary" onclick="openLeadDetail('${l.id}')">View</button>
          ${role === 'admin' ? `<button class="btn btn-sm btn-secondary" onclick="openEditLeadModal('${l.id}')" style="margin-left:4px">Edit</button>` : ''}
          ${role === 'telecaller' ? `<button class="btn btn-sm btn-primary" onclick="openUpdateStatusModal('${l.id}','${l.status}',event)" style="margin-left:4px">Update</button>` : ''}
        </td>
      </tr>`).join('');
  }

  container.innerHTML = `
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon">⌕</span>
        <input type="text" id="leads-search" placeholder="Search by name, phone, status…">
      </div>
      ${can('admin') ? `<select class="filter-select" id="stage-filter">
        <option value="">All Stages</option>
        <option value="lead">Lead</option>
        <option value="counseling">Counseling</option>
        <option value="accounts">Accounts</option>
        <option value="completed">Completed</option>
      </select>` : ''}
      <select class="filter-select" id="status-filter">
        <option value="">All Statuses</option>
        <option>New</option><option>Busy</option><option>Call Back</option>
        <option>Interested</option><option>Not Interested</option>
        <option>Counseling Complete</option><option>Payment Received</option>
      </select>
      <button class="btn btn-secondary btn-sm" onclick="loadLeadsData()">↺ Refresh</button>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Phone</th><th>Destination</th>
              <th>Stage</th><th>Status</th><th>Tele-Caller</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody id="leads-table-body">
            <tr><td colspan="8"><div class="loading-center"><div class="spinner"></div></div></td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  // Events
  let searchTimer;
  container.querySelector('#leads-search').addEventListener('input', e => {
    search = e.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  const sf = container.querySelector('#stage-filter');
  if (sf) sf.addEventListener('change', e => { stageFilter = e.target.value; load(); });
  container.querySelector('#status-filter').addEventListener('change', e => { statusFilter = e.target.value; load(); });

  window.loadLeadsData = load;
  await load();
}

// ── CREATE LEAD MODAL ─────────────────────────────────────────────────────
async function openCreateLeadModal() {
  let users = [];
  try { users = await api('GET', '/users'); } catch {}
  const telecallers = users.filter(u => u.role === 'telecaller');

  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>◈ Create New Lead</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input class="form-control" id="lead-name" placeholder="Candidate full name">
          </div>
          <div class="form-group">
            <label class="form-label">Phone *</label>
            <input class="form-control" id="lead-phone" placeholder="+91 XXXXX XXXXX" type="tel">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" id="lead-email" placeholder="email@example.com" type="email">
          </div>
          <div class="form-group">
            <label class="form-label">Lead Source</label>
            <select class="form-control" id="lead-source">
              <option value="">— Select —</option>
              <option>Walk-in</option><option>Referral</option><option>Online</option>
              <option>Advertisement</option><option>Social Media</option><option>Agent</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Destination Country</label>
            <select class="form-control" id="lead-destination">
              <option value="">— Select —</option>
              <option>UAE</option><option>Qatar</option><option>Saudi Arabia</option>
              <option>Kuwait</option><option>Bahrain</option><option>Oman</option>
              <option>Malaysia</option><option>Singapore</option><option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Visa Type</label>
            <select class="form-control" id="lead-visa">
              <option value="">— Select —</option>
              <option>Work Visa</option><option>Business Visa</option>
              <option>Tourist Visa</option><option>Resident Visa</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Assign Tele-Caller</label>
          <select class="form-control" id="lead-caller">
            <option value="">— Unassigned —</option>
            ${telecallers.map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Notes</label>
          <textarea class="form-control" id="lead-notes" rows="3" placeholder="Additional notes…"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="create-lead-btn" onclick="submitCreateLead()">＋ Create Lead</button>
      </div>
    </div>`);
}

async function submitCreateLead() {
  const btn = document.getElementById('create-lead-btn');
  const name = document.getElementById('lead-name').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  if (!name || !phone) return toast('Name and phone are required', 'error');
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    await api('POST', '/leads', {
      name, phone,
      email: document.getElementById('lead-email').value.trim(),
      source: document.getElementById('lead-source').value,
      destination: document.getElementById('lead-destination').value,
      visa_type: document.getElementById('lead-visa').value,
      assigned_telecaller_id: document.getElementById('lead-caller').value || null,
      notes: document.getElementById('lead-notes').value.trim()
    });
    toast('Lead created successfully!', 'success');
    closeModal();
    if (window.loadLeadsData) loadLeadsData();
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false; btn.textContent = '＋ Create Lead';
  }
}

// ── BULK CSV UPLOAD ───────────────────────────────────────────────────────
async function handleCSVUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const text = ev.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return toast('CSV is empty or invalid', 'error');
    
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').toLowerCase().trim());
    const leads = [];
    for(let i=1; i<lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
        const lead = {};
        headers.forEach((h, idx) => {
            if (h === 'name') lead.name = values[idx];
            if (h === 'phone') lead.phone = values[idx];
            if (h === 'email') lead.email = values[idx];
            if (h.includes('source')) lead.source = values[idx];
            if (h.includes('destination')) lead.destination = values[idx];
            if (h === 'visa type' || h === 'visa_type') lead.visa_type = values[idx];
            if (h === 'notes') lead.notes = values[idx];
        });
        if (lead.name || lead.phone) leads.push(lead);
    }
    if (!leads.length) return toast('No valid rows found', 'error');
    try {
        await api('POST', '/leads/bulk', { leads });
        toast(`${leads.length} leads imported!`, 'success');
        if (window.loadLeadsData) loadLeadsData();
    } catch (err) { toast(err.message, 'error'); }
  };
  reader.readAsText(file);
}

// ── EDIT LEAD MODAL ───────────────────────────────────────────────────────
async function openEditLeadModal(leadId) {
  let [lead, users] = await Promise.all([
    api('GET', `/leads/${leadId}`),
    api('GET', '/users')
  ]);
  const telecallers = users.filter(u => u.role === 'telecaller');
  const counselors = users.filter(u => u.role === 'counselor');

  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>Edit Lead</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Full Name *</label><input class="form-control" id="edit-name" value="${escapeHTML(lead.name)}"></div>
          <div class="form-group"><label class="form-label">Phone *</label><input class="form-control" id="edit-phone" value="${escapeHTML(lead.phone)}" type="tel"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Email</label><input class="form-control" id="edit-email" value="${escapeHTML(lead.email||'')}" type="email"></div>
          <div class="form-group">
            <label class="form-label">Lead Source</label>
            <select class="form-control" id="edit-source">
              <optgroup label="Current"><option value="${lead.source||''}">${lead.source||'— Select —'}</option></optgroup>
              <option>Walk-in</option><option>Referral</option><option>Online</option><option>Advertisement</option><option>Social Media</option><option>Agent</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Destination Country</label>
            <select class="form-control" id="edit-destination">
              <optgroup label="Current"><option value="${lead.destination||''}">${lead.destination||'— Select —'}</option></optgroup>
              <option>UAE</option><option>Qatar</option><option>Saudi Arabia</option><option>Kuwait</option><option>Bahrain</option><option>Oman</option><option>Malaysia</option><option>Singapore</option><option>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Visa Type</label>
            <select class="form-control" id="edit-visa">
              <optgroup label="Current"><option value="${lead.visa_type||''}">${lead.visa_type||'— Select —'}</option></optgroup>
              <option>Work Visa</option><option>Business Visa</option><option>Tourist Visa</option><option>Resident Visa</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Assign Tele-Caller</label>
            <select class="form-control" id="edit-caller">
              <option value="">— Unassigned —</option>
              ${telecallers.map(u => `<option value="${u.id}" ${lead.assigned_telecaller_id===u.id?'selected':''}>${u.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Assign Counselor</label>
            <select class="form-control" id="edit-counselor">
              <option value="">— Unassigned —</option>
              ${counselors.map(u => `<option value="${u.id}" ${lead.assigned_counselor_id===u.id?'selected':''}>${u.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><textarea class="form-control" id="edit-notes" rows="3">${lead.notes||''}</textarea></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" id="edit-lead-btn" onclick="submitEditLead('${lead.id}')">Save Changes</button>
      </div>
    </div>`);
}

async function submitEditLead(leadId) {
  const btn = document.getElementById('edit-lead-btn');
  const name = document.getElementById('edit-name').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  if (!name || !phone) return toast('Name and phone are required', 'error');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    await api('PUT', `/leads/${leadId}`, {
      name, phone,
      email: document.getElementById('edit-email').value.trim(),
      source: document.getElementById('edit-source').value,
      destination: document.getElementById('edit-destination').value,
      visa_type: document.getElementById('edit-visa').value,
      assigned_telecaller_id: document.getElementById('edit-caller').value || null,
      assigned_counselor_id: document.getElementById('edit-counselor').value || null,
      notes: document.getElementById('edit-notes').value.trim()
    });
    toast('Lead updated successfully!', 'success');
    closeModal();
    if (window.loadLeadsData) loadLeadsData();
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false; btn.textContent = 'Save Changes';
  }
}

// ── UPDATE STATUS MODAL (Telecaller) ─────────────────────────────────────
async function openUpdateStatusModal(leadId, currentStatus, e) {
  if (e) e.stopPropagation();
  openModal(`
    <div class="modal">
      <div class="modal-header">
        <h3>Update Call Status</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Call Status</label>
          <select class="form-control" id="new-status">
            <option ${currentStatus==='New'?'selected':''}>New</option>
            <option ${currentStatus==='Busy'?'selected':''}>Busy</option>
            <option ${currentStatus==='Call Back'?'selected':''}>Call Back</option>
            <option ${currentStatus==='Interested'?'selected':''}>Interested</option>
            <option ${currentStatus==='Not Interested'?'selected':''}>Not Interested</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Note</label>
          <textarea class="form-control" id="status-note" rows="3" placeholder="Add a note about this call…"></textarea>
        </div>
        <div id="interested-notice" style="display:none;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.3);border-radius:var(--radius);padding:12px;font-size:13px;color:var(--green)">
          ✓ Marking as <strong>Interested</strong> will automatically transfer this lead to the Counseling queue.
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitUpdateStatus('${leadId}')">Update Status</button>
      </div>
    </div>`);

  document.getElementById('new-status').addEventListener('change', e => {
    document.getElementById('interested-notice').style.display =
      ['Interested','Approved'].includes(e.target.value) ? 'block' : 'none';
  });
}

async function submitUpdateStatus(leadId) {
  const status = document.getElementById('new-status').value;
  const note = document.getElementById('status-note').value.trim();
  try {
    await api('PUT', `/leads/${leadId}/status`, { status, note });
    toast('Status updated!', 'success');
    closeModal();
    if (window.loadLeadsData) loadLeadsData();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── LEAD DETAIL MODAL ─────────────────────────────────────────────────────
async function openLeadDetail(leadId) {
  openModal(`<div class="modal modal-lg"><div class="loading-center" style="height:300px"><div class="spinner"></div> Loading…</div></div>`);
  try {
    const [lead, logs, sessions, payments, cheques, docs, users, comments] = await Promise.all([
      api('GET', `/leads/${leadId}`),
      api('GET', `/leads/${leadId}/logs`),
      api('GET', `/leads/${leadId}/sessions`),
      api('GET', `/leads/${leadId}/payments`),
      api('GET', `/leads/${leadId}/cheques`),
      api('GET', `/leads/${leadId}/documents`).catch(()=>[]),
      api('GET', '/users').catch(()=>[]),
      api('GET', `/leads/${leadId}/comments`).catch(()=>[])
    ]);
    renderLeadDetailModal(lead, logs, sessions, payments, cheques, docs, users, comments);
  } catch (e) {
    document.querySelector('#active-modal .modal').innerHTML =
      `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

function renderLeadDetailModal(lead, logs, sessions, payments, cheques, docs, users, comments) {
  const role = state.user.role;
  const stageMap = { lead: 0, counseling: 1, accounts: 2, completed: 3 };
  const curStage = stageMap[lead.stage] || 0;
  const stages = ['Lead', 'Counseling', 'Accounts', 'Completed'];

  const pipelineHtml = stages.map((s, i) => `
    <div class="stage-step ${i < curStage ? 'done' : i === curStage ? 'active' : ''}">
      <div class="stage-step-num">${i < curStage ? '✓' : i + 1}</div>
      <div class="stage-step-info">
        <div class="stage-step-label">Stage ${i + 1}</div>
        <div class="stage-step-name">${s}</div>
      </div>
    </div>`).join('');

  const telecallers = users.filter(u => u.role === 'telecaller');
  const counselors = users.filter(u => u.role === 'counselor');

  const sessionsHtml = sessions.length ? sessions.map(s => `
    <div class="session-card">
      <div class="session-num">Session ${s.session_number}</div>
      <div class="session-status">${s.sitting_status}</div>
      ${s.notes ? `<div class="session-note">${escapeHTML(s.notes)}</div>` : ''}
      <div class="session-date">${fmtDateTime(s.created_at)}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">by ${s.counselor_name}</div>
    </div>`).join('') : '<p class="text-muted">No counseling sessions yet</p>';

  const paymentsHtml = payments.length ? payments.map(p => `
    <div class="payment-row">
      <div>
        <div style="font-weight:500;color:var(--text)">${fmtDate(p.payment_date)}</div>
        <div style="font-size:11px;color:var(--text3)">${p.recorded_by_name}</div>
      </div>
      <span class="payment-mode">${p.payment_mode}</span>
      ${p.notes ? `<span style="font-size:12px;color:var(--text2)">${escapeHTML(p.notes)}</span>` : ''}
      <div class="payment-amount">${fmtMoney(p.amount)}</div>
    </div>`).join('') : '<p class="text-muted">No payments recorded</p>';

  const chequesHtml = cheques.length ? cheques.map(c => `
    <div class="cheque-card">
      <div>
        <div class="cheque-num">#${c.cheque_number}</div>
        <div class="cheque-bank">${c.bank_name} · ${fmtDate(c.issue_date)}</div>
      </div>
      ${chequeBadge(c.status)}
      <div style="margin-left:auto;text-align:right">
        <div class="cheque-amount">${fmtMoney(c.amount)}</div>
        ${can(['accountant','admin']) && c.status !== 'Cleared' && c.status !== 'Bounced' ?
          `<button class="btn btn-sm btn-secondary" style="margin-top:4px" onclick="openUpdateChequeModal('${c.id}','${c.status}')">Update Status</button>` : ''}
      </div>
    </div>`).join('') : '<p class="text-muted">No cheques recorded</p>';

  const docsHtml = docs.length ? docs.map(d => `
    <div style="display:flex;align-items:center;padding:12px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;background:var(--bg3)">
       <div>
         <div style="font-weight:500;font-size:13px;color:var(--text)">${escapeHTML(d.original_name)}</div>
         <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:2px">${escapeHTML(d.document_type)} · by ${d.uploaded_by_name} on ${fmtDate(d.created_at)}</div>
       </div>
       <button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="downloadDoc('${d.id}')">Download</button>
    </div>`).join('') : '<p class="text-muted">No documents uploaded</p>';

  const logsHtml = logs.length ? `<div class="timeline">${logs.map((l, i) => `
    <div class="tl-item ${i === 0 ? 'recent' : ''}">
      <div class="tl-dot"></div>
      <div class="tl-content">
        <div class="tl-title">
          ${l.new_status ? `Status → <strong>${l.new_status}</strong>` : ''}
          ${l.new_stage && l.new_stage !== l.old_stage ? ` · Stage → <strong>${l.new_stage}</strong>` : ''}
        </div>
        <div class="tl-meta">${l.changed_by_name} · ${fmtDateTime(l.created_at)}</div>
        ${l.note ? `<div class="tl-note">${escapeHTML(l.note)}</div>` : ''}
      </div>
    </div>`).join('')}</div>` : '<p class="text-muted">No activity yet</p>';

  const commentsHtml = comments.length ? comments.map(c => `
    <div class="chat-msg ${c.author_id === state.user.id ? 'mine' : ''}">
      <div class="chat-meta">
        ${c.author_id === state.user.id ? 'You' : c.author_name} 
        <span style="opacity:0.5;font-size:10px">• ${fmtDateTime(c.created_at)}</span>
      </div>
      <div class="chat-bubble">
        ${escapeHTML(c.comment).replace(/@([a-zA-Z0-9_\-\.]+)/g, '<span class="mention">@$1</span>')}
      </div>
    </div>`).join('') : '<p class="text-muted" style="text-align:center;padding:20px 0">No messages. Start the conversation!</p>';

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  document.querySelector('#active-modal').innerHTML = `
    <div class="modal modal-lg">
      <div class="modal-header">
        <div>
          <h3>${escapeHTML(lead.name)}</h3>
          <div style="font-size:12px;color:var(--text3);font-family:var(--mono);margin-top:2px">${escapeHTML(lead.phone)} ${lead.email ? '· ' + escapeHTML(lead.email) : ''}</div>
        </div>
        ${statusBadge(lead.status)}
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body">

        <div class="stage-pipeline">${pipelineHtml}</div>

        <div class="detail-grid" style="margin-bottom:16px">
          <div class="detail-item"><label>Destination</label><span>${escapeHTML(lead.destination) || '—'}</span></div>
          <div class="detail-item"><label>Visa Type</label><span>${escapeHTML(lead.visa_type) || '—'}</span></div>
          <div class="detail-item"><label>Source</label><span>${escapeHTML(lead.source) || '—'}</span></div>
          <div class="detail-item"><label>Created</label><span>${fmtDateTime(lead.created_at)}</span></div>
          <div class="detail-item"><label>Tele-Caller</label><span>${escapeHTML(lead.telecaller_name) || '—'}</span></div>
          <div class="detail-item"><label>Counselor</label><span>${escapeHTML(lead.counselor_name) || '—'}</span></div>
          ${lead.notes ? `<div class="detail-item" style="grid-column:1/-1"><label>Notes</label><span>${escapeHTML(lead.notes)}</span></div>` : ''}
        </div>

        ${can('admin') ? `
        <div class="mb-20">
          <div class="section-title">⚙ Admin: Reassign</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Tele-Caller</label>
              <select class="form-control" id="reassign-tc">
                <option value="">— Unassigned —</option>
                ${telecallers.map(u => `<option value="${u.id}" ${lead.assigned_telecaller_id===u.id?'selected':''}>${u.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Counselor</label>
              <select class="form-control" id="reassign-co">
                <option value="">— Unassigned —</option>
                ${counselors.map(u => `<option value="${u.id}" ${lead.assigned_counselor_id===u.id?'selected':''}>${u.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="submitReassign('${lead.id}')">Save Assignment</button>
        </div>` : ''}

        <div class="tabs">
          <div class="tab active" onclick="switchTab(this,'tab-chat')">💬 Chat (${comments.length})</div>
          <div class="tab" onclick="switchTab(this,'tab-sessions')">◉ Counseling (${sessions.length})</div>
          <div class="tab" onclick="switchTab(this,'tab-docs')">📄 Docs (${docs.length})</div>
          <div class="tab" onclick="switchTab(this,'tab-payments')">💳 Payments (${payments.length})</div>
          <div class="tab" onclick="switchTab(this,'tab-cheques')">▣ Cheques (${cheques.length})</div>
          <div class="tab" onclick="switchTab(this,'tab-logs')">🕐 Audit Log (${logs.length})</div>
        </div>

        <div id="tab-chat">
          <div class="chat-container" id="chat-container">
            ${commentsHtml}
          </div>
          <div class="chat-input" style="position:relative">
            <textarea id="chat-textarea" class="form-control" placeholder="Type a message... Use @Tag to mention"></textarea>
            <button class="btn btn-primary" onclick="submitComment('${lead.id}')" style="height:fit-content;margin-top:auto">Send</button>
            <div id="mention-dropdown" style="display:none;position:absolute;bottom:100%;left:0;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius);max-height:150px;overflow-y:auto;z-index:10;box-shadow:var(--shadow-sm);width:200px"></div>
          </div>
        </div>
        
        <div id="tab-sessions" style="display:none">
          ${can(['counselor','admin']) && ['lead', 'counseling'].includes(lead.stage) ? `
            <div style="margin-bottom:16px">
               <button class="btn btn-primary btn-sm" onclick="openAddSessionModal('${lead.id}')">＋ Log Session</button>
               <button class="btn btn-success btn-sm" style="margin-left:8px" onclick="openCompleteCounselingModal('${lead.id}')">✓ Complete Counseling</button>
            </div>` : ''}
          ${sessionsHtml}
        </div>
        <div id="tab-docs" style="display:none">
          <div style="margin-bottom:16px;display:flex;gap:10px">
              <select id="doc-upload-type" class="form-control" style="width:150px">
                 <option>Passport</option><option>Visa</option><option>Resume</option><option>Other</option>
              </select>
              <input type="file" id="doc-upload-input" style="display:none" onchange="handleDocUpload(event, '${lead.id}')">
              <button class="btn btn-primary btn-sm" onclick="document.getElementById('doc-upload-input').click()">＋ Upload Document</button>
          </div>
          ${docsHtml}
        </div>
        <div id="tab-payments" style="display:none">
          ${can(['accountant','admin']) ? `
            <button class="btn btn-primary btn-sm" style="margin-bottom:16px" onclick="openAddPaymentModal('${lead.id}')">＋ Record Payment</button>` : ''}
          ${totalPaid ? `<div style="margin-bottom:12px">Total Paid: <span class="amount-display">${fmtMoney(totalPaid)}</span></div>` : ''}
          ${paymentsHtml}
        </div>
        <div id="tab-cheques" style="display:none">
          ${can(['accountant','admin']) ? `
            <button class="btn btn-primary btn-sm" style="margin-bottom:16px" onclick="openAddChequeModal('${lead.id}')">＋ Record Cheque</button>` : ''}
          ${chequesHtml}
        </div>
        <div id="tab-logs" style="display:none">
          ${logsHtml}
        </div>

      </div>
    </div>`;

  setTimeout(() => {
    const cc = document.getElementById('chat-container');
    if (cc) cc.scrollTop = cc.scrollHeight;
    
    // Mention Logic
    const ta = document.getElementById('chat-textarea');
    const md = document.getElementById('mention-dropdown');
    if(ta && md) {
      ta.addEventListener('input', e => {
        const val = ta.value;
        const cursorP = ta.selectionStart;
        const textBefore = val.slice(0, cursorP);
        const match = textBefore.match(/@([a-zA-Z0-9_\-\.]*)$/);
        if (match) {
          const q = match[1].toLowerCase();
          const matches = users.filter(u => u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
          if(matches.length) {
            md.innerHTML = matches.map(u => `
              <div style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border)" 
                   onmousedown="event.preventDefault(); document.getElementById('chat-textarea').value = document.getElementById('chat-textarea').value.slice(0, ${cursorP - match[1].length}) + '${u.name.replace(/\\s+/g, '_')}' + ' '; document.getElementById('mention-dropdown').style.display='none'; document.getElementById('chat-textarea').focus();">
                <div style="font-weight:500;font-size:13px;color:var(--text)">${escapeHTML(u.name)}</div>
                <div style="font-size:11px;color:var(--text3);text-transform:capitalize">${escapeHTML(u.role)}</div>
              </div>
            `).join('');
            md.style.display = 'block';
          } else { md.style.display = 'none'; }
        } else { md.style.display = 'none'; }
      });
      ta.addEventListener('blur', () => setTimeout(()=>md.style.display='none', 200));
    }
  }, 50);
}

function switchTab(el, tabId) {
  el.closest('.modal').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const tabs = ['tab-chat','tab-sessions','tab-docs','tab-payments','tab-cheques','tab-logs'];
  tabs.forEach(t => {
    const el2 = document.getElementById(t);
    if (el2) el2.style.display = t === tabId ? 'block' : 'none';
  });
  if (tabId === 'tab-chat') {
    const cc = document.getElementById('chat-container');
    if (cc) cc.scrollTop = cc.scrollHeight;
  }
}

async function submitComment(leadId) {
  const text = document.getElementById('chat-textarea').value.trim();
  if (!text) return;
  try {
    await api('POST', `/leads/${leadId}/comments`, { comment: text });
    await openLeadDetail(leadId); // Refresh modal
    // Reactivate chat tab after refresh
    const chatTabEl = document.querySelector('.tabs .tab:nth-child(1)');
    if (chatTabEl) switchTab(chatTabEl, 'tab-chat');
  } catch (e) { toast(e.message, 'error'); }
}

async function submitReassign(leadId) {
  const tc = document.getElementById('reassign-tc').value;
  const co = document.getElementById('reassign-co').value;
  try {
    await api('PUT', `/leads/${leadId}/assign`, {
      assigned_telecaller_id: tc || null,
      assigned_counselor_id: co || null
    });
    toast('Assignment updated!', 'success');
    if (window.loadLeadsData) loadLeadsData();
  } catch (e) { toast(e.message, 'error'); }
}

async function handleDocUpload(e, leadId) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';
  const dtype = document.getElementById('doc-upload-type').value;
  
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      await api('POST', '/leads/' + leadId + '/documents', {
        document_type: dtype,
        original_name: file.name,
        file_data: ev.target.result
      });
      toast('Document uploaded!', 'success');
      openLeadDetail(leadId); // refresh
    } catch (err) { toast(err.message, 'error'); }
  };
  reader.readAsDataURL(file);
}

async function downloadDoc(docId) {
  try {
    const res = await fetch(API + '/documents/' + docId, {
       headers: { 'Authorization': 'Bearer ' + state.token }
    });
    if (!res.ok) throw new Error('Failed to download document');
    
    // Attempt to extract filename from content-disposition
    let filename = "download";
    const cd = res.headers.get('content-disposition');
    if (cd && cd.includes('filename="')) {
      filename = cd.split('filename="')[1].split('"')[0];
    }
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = filename; 
    a.click();
  } catch (e) { toast(e.message, 'error'); }
}
