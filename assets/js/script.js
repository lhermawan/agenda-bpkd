const holidaysData = [
    { date: "01-01", label: "Libur Nasional: Tahun Baru Masehi", type: "holiday" },
    { date: "04-25", label: "Hari Penting: Hari Otonomi Daerah", type: "important" },
    { date: "05-01", label: "Libur Nasional: Hari Buruh Internasional", type: "holiday" },
    { date: "05-02", label: "Hari Penting: Hari Pendidikan Nasional", type: "important" },
    { date: "06-01", label: "Libur Nasional: Hari Lahir Pancasila", type: "holiday" },
    { date: "06-12", label: "Hari Penting Pemda: Hari Jadi Kabupaten Ciamis", type: "important" },
    { date: "08-17", label: "Libur Nasional: Hari Kemerdekaan Republik Indonesia", type: "holiday" },
    { date: "11-10", label: "Hari Penting: Hari Pahlawan", type: "important" },
    { date: "11-29", label: "Hari Penting: HUT KORPRI / ASN", type: "important" },
    { date: "12-25", label: "Libur Nasional: Hari Raya Natal", type: "holiday" }
];

const API_URL = 'api.php';
let agendas = [];
let audioEnabled = localStorage.getItem('bpkdAutoVoiceEnabled') === 'true';
let currentFilter = 'today';
let selectedDate = null;
let viewDate = new Date();
let adminSession = {
    loggedIn: Boolean(window.APP_SESSION?.loggedIn),
    adminName: window.APP_SESSION?.adminName || ''
};
const AGENDA_FINISHED_THRESHOLD_MS = 60 * 60 * 1000;

window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
};

document.addEventListener('DOMContentLoaded', () => {
    bindForms();
    renderCalendar();
    renderAuthState();
    loadSession();
    renderAudioState();
    bindAutoVoiceUnlock();
    loadAgendas();
});

function bindForms() {
    document.getElementById('agendaForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveAgenda(this);
    });
}

async function apiRequest(action, options = {}) {
    const response = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`, {
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
    });
    const data = await response.json().catch(() => ({ success: false, message: 'Respons server tidak valid.' }));
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Permintaan gagal diproses.');
    }
    return data;
}

function showMessage(message, type = 'success') {
    const el = document.getElementById('appMessage');
    if (!el) return;

    el.className = `alert alert-${type} shadow-sm`;
    el.textContent = message;
    window.setTimeout(() => el.classList.add('d-none'), 4500);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function dateKey(month, day) {
    return `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function loadSession() {
    try {
        const data = await apiRequest('session');
        adminSession = {
            loggedIn: Boolean(data.loggedIn),
            adminName: data.adminName || ''
        };
        renderAuthState();
    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

function renderAuthState() {
    const adminBadge = document.getElementById('adminBadge');
    const adminName = document.getElementById('adminName');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginPageBtn = document.getElementById('loginPageBtn');
    const loginNotice = document.getElementById('loginNotice');
    const agendaForm = document.getElementById('agendaForm');
    const addAgendaButtons = document.querySelectorAll('#addAgendaSidebarBtn, #addAgendaTopBtn');

    adminBadge?.classList.toggle('d-none', !adminSession.loggedIn);
    logoutBtn?.classList.toggle('d-none', !adminSession.loggedIn);
    loginPageBtn?.classList.toggle('d-none', adminSession.loggedIn);
    loginNotice?.classList.toggle('d-none', adminSession.loggedIn);
    addAgendaButtons.forEach(button => {
        button.disabled = !adminSession.loggedIn;
        button.title = adminSession.loggedIn ? 'Tambah agenda baru' : 'Login admin diperlukan untuk tambah agenda';
    });

    if (adminName) {
        adminName.textContent = adminSession.adminName || 'Admin';
    }

    agendaForm?.querySelectorAll('input, textarea, button').forEach(el => {
        if (el.id !== 'cancelEditBtn') {
            el.disabled = !adminSession.loggedIn;
        }
    });

    renderTable();
}

async function logoutAdmin() {
    try {
        const data = await apiRequest('logout', { method: 'POST', body: JSON.stringify({}) });
        adminSession = { loggedIn: false, adminName: '' };
        resetAgendaForm();
        renderAuthState();
        showMessage(data.message || 'Logout berhasil.', 'success');
    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

async function loadAgendas() {
    try {
        const data = await apiRequest('agendas');
        agendas = data.agendas || [];
        renderTable();
        renderNearestCountdown();
    } catch (error) {
        agendas = [];
        renderTable();
        renderNearestCountdown();
        showMessage(error.message, 'danger');
    }
}

async function saveAgenda(form) {
    if (!adminSession.loggedIn) {
        showMessage('Silakan login sebagai admin untuk menyimpan agenda.', 'warning');
        return;
    }

    const editId = document.getElementById('editId').value;
    const payload = {
        nama: document.getElementById('nama').value,
        lokasi: document.getElementById('lokasi').value,
        peserta: document.getElementById('peserta').value,
        waktu: document.getElementById('waktu').value
    };

    try {
        const data = editId
            ? await updateAgenda(editId, payload)
            : await apiRequest('agendas', { method: 'POST', body: JSON.stringify(payload) });

        agendas = data.agendas || [];
        form.reset();
        resetAgendaForm();
        selectedDate = null;
        hideAgendaModal();
        renderTable();
        renderNearestCountdown();
        showMessage(data.message || 'Agenda berhasil disimpan.', 'success');
    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

async function updateAgenda(id, payload) {
    const response = await fetch(`${API_URL}?action=agendas&id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({ success: false, message: 'Respons server tidak valid.' }));
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal memperbarui agenda.');
    }
    return data;
}

function openAgendaModal(mode = 'add') {
    if (!adminSession.loggedIn) {
        showMessage('Silakan login sebagai admin untuk menambah agenda.', 'warning');
        return;
    }

    if (mode !== 'edit') {
        resetAgendaForm();
    }

    const modalEl = document.getElementById('agendaModal');
    if (!modalEl) return;

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    document.getElementById('nama')?.focus();
}

function hideAgendaModal() {
    const modalEl = document.getElementById('agendaModal');
    if (!modalEl) return;

    bootstrap.Modal.getInstance(modalEl)?.hide();
}

function editAgenda(id) {
    if (!adminSession.loggedIn) {
        showMessage('Silakan login sebagai admin untuk mengedit agenda.', 'warning');
        return;
    }

    const agenda = agendas.find(a => Number(a.id) === Number(id));
    if (!agenda) return;

    document.getElementById('editId').value = agenda.id;
    document.getElementById('nama').value = agenda.nama;
    document.getElementById('lokasi').value = agenda.lokasi;
    document.getElementById('peserta').value = agenda.peserta;
    document.getElementById('waktu').value = agenda.waktu;
    document.getElementById('editBadge')?.classList.remove('d-none');
    document.getElementById('agendaModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-primary me-1"></i> Edit Agenda';
    document.getElementById('agendaModalSubtitle').textContent = 'Perbarui detail agenda yang sudah tersimpan.';
    document.getElementById('saveAgendaBtn').innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Update Agenda';
    openAgendaModal('edit');
}

function resetAgendaForm() {
    document.getElementById('agendaForm')?.reset();
    document.getElementById('editId').value = '';
    document.getElementById('editBadge')?.classList.add('d-none');
    const modalTitle = document.getElementById('agendaModalTitle');
    const modalSubtitle = document.getElementById('agendaModalSubtitle');
    const saveBtn = document.getElementById('saveAgendaBtn');

    if (modalTitle) modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-primary me-1"></i> Tambah Agenda';
    if (modalSubtitle) modalSubtitle.textContent = 'Isi detail agenda kerja yang akan ditampilkan pada dashboard.';
    if (saveBtn) saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk me-1"></i> Simpan Agenda';
}

async function deleteAgenda(id) {
    if (!adminSession.loggedIn) {
        showMessage('Silakan login sebagai admin untuk menghapus agenda.', 'warning');
        return;
    }

    if(confirm('Apakah Anda yakin ingin menghapus jadwal agenda ini dari database?')) {
        try {
            const response = await fetch(`${API_URL}?action=agendas&id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Gagal menghapus agenda.');
            }
            agendas = data.agendas || [];
            renderTable();
            renderNearestCountdown();
            showMessage(data.message || 'Agenda berhasil dihapus.', 'success');
        } catch (error) {
            showMessage(error.message, 'danger');
        }
    }
}

async function markNotificationSent(id, type) {
    const agenda = agendas.find(a => Number(a.id) === Number(id));
    if (agenda) {
        agenda[`notified${type}`] = true;
    }

    try {
        const data = await apiRequest('notify', {
            method: 'POST',
            body: JSON.stringify({ id, type: String(type) })
        });
        agendas = data.agendas || agendas;
    } catch (error) {
        showMessage(error.message, 'warning');
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('monthLabel');
    if (!grid || !label) return;

    grid.innerHTML = '<div class="cal-head text-danger">M</div><div class="cal-head">S</div><div class="cal-head">S</div><div class="cal-head">R</div><div class="cal-head">K</div><div class="cal-head">J</div><div class="cal-head">S</div>';
    label.innerText = viewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    for(let i = 0; i < firstDayIndex; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for(let i = 1; i <= totalDays; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day';

        const h = holidaysData.find(x => x.date === dateKey(month, i));
        if(h) div.classList.add(h.type === 'holiday' ? 'cal-holiday' : 'cal-important');

        const today = new Date();
        if(i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            div.classList.add('cal-today');
        }

        if(selectedDate && i === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) {
            div.classList.add('cal-selected');
        }

        div.innerText = i;
        div.onclick = () => {
            selectedDate = new Date(year, month, i);
            currentFilter = 'date';
            setFilterButtons('date');
            document.getElementById('dateInfo').innerHTML = `
                <div class="text-primary fw-bold"><i class="fa-regular fa-calendar-check"></i> ${i} ${viewDate.toLocaleDateString('id-ID', { month: 'long' })} ${year}</div>
                <div class="small text-dark mt-1">${h ? escapeHtml(h.label) : 'Tidak ada hari libur nasional atau agenda penting Pemda.'}</div>
            `;
            renderCalendar();
            renderTable();
        };
        grid.appendChild(div);
    }
}

function changeMonth(offset) {
    viewDate.setMonth(viewDate.getMonth() + offset);
    selectedDate = null;
    if (currentFilter === 'date') currentFilter = 'today';
    setFilterButtons(currentFilter);
    document.getElementById('dateInfo').innerHTML = '<i class="fa-solid fa-circle-info me-1"></i> Klik pada kotak tanggal untuk melihat keterangan hari penting atau memfilter agenda.';
    renderCalendar();
    renderTable();
}

function filterAgenda(mode) {
    currentFilter = mode;
    selectedDate = null;
    setFilterButtons(mode);
    document.getElementById('dateInfo').innerHTML = '<i class="fa-solid fa-circle-info me-1"></i> Klik pada kotak tanggal untuk melihat keterangan hari penting atau memfilter agenda.';
    renderCalendar();
    renderTable();
}

function setFilterButtons(mode) {
    document.getElementById('btnToday')?.classList.toggle('active', mode === 'today');
    document.getElementById('btnAll')?.classList.toggle('active', mode === 'all');
}

function renderAudioState() {
    const btn = document.getElementById('initAudioBtn');
    const voiceStatus = document.getElementById('nearestVoiceStatus');

    if (btn) {
        btn.innerHTML = audioEnabled
            ? '<i class="fa-solid fa-check-circle me-1"></i> Auto Voice Aktif'
            : '<i class="fa-solid fa-volume-high me-1"></i> Aktifkan Suara';
        btn.classList.toggle('btn-success', !audioEnabled);
        btn.classList.toggle('btn-primary', audioEnabled);
    }

    if (voiceStatus) {
        voiceStatus.className = audioEnabled
            ? 'badge bg-success-subtle text-success-emphasis'
            : 'badge bg-secondary-subtle text-secondary-emphasis';
        voiceStatus.textContent = audioEnabled ? 'Voice otomatis aktif' : 'Voice nonaktif';
    }
}

function bindAutoVoiceUnlock() {
    const unlock = () => {
        if (audioEnabled) {
            window.speechSynthesis.resume();
        }
    };

    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock, { passive: true });
}

function initAudio() {
    window.speechSynthesis.resume();
    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance('Sistem notifikasi suara otomatis BPKD Ciamis aktif.');
    utterThis.lang = 'id-ID';
    utterThis.volume = 1;
    synth.speak(utterThis);

    audioEnabled = true;
    localStorage.setItem('bpkdAutoVoiceEnabled', 'true');
    renderAudioState();
    showMessage('Sistem suara otomatis berhasil diaktifkan. Voice akan berbunyi pada H-30 menit, H-10 menit, dan saat agenda mulai.', 'success');
}

function stopAudio() {
    window.speechSynthesis.cancel();
    audioEnabled = false;
    localStorage.setItem('bpkdAutoVoiceEnabled', 'false');
    renderAudioState();
    showMessage('Sistem suara otomatis dinonaktifkan.', 'warning');
}

function playAudio(nama, lokasi, peserta, msg) {
    if(!audioEnabled) return false;
    window.speechSynthesis.resume();

    const kalimatTambahan = (typeof msg === 'string' && msg.trim() !== '') ? ` ${msg}.` : '';
    const kalimatUtama = `Mohon perhatian. Mengingatkan agenda ${nama}. Bertempat di ${lokasi}. Yang menghadiri, ${peserta}.${kalimatTambahan}`;

    const utterThis = new SpeechSynthesisUtterance(kalimatUtama);
    utterThis.lang = 'id-ID';
    utterThis.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if(idVoice) utterThis.voice = idVoice;

    window.speechSynthesis.speak(utterThis);
    return true;
}

function manualTrigger(id) {
    const agenda = agendas.find(a => Number(a.id) === Number(id));
    if(agenda && !playAudio(agenda.nama, agenda.lokasi, agenda.peserta, '')) {
        showMessage('Klik tombol Aktifkan Suara terlebih dahulu agar voice dapat diputar.', 'warning');
    }
}

setInterval(() => {
    processAutomaticVoiceNotifications();
    renderNearestCountdown();
    renderTable();
}, 1000);


function getAgendaDate(agenda) {
    return new Date(String(agenda.waktu).replace(' ', 'T'));
}

function formatDurationParts(diffMs) {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { days, hours, minutes, seconds };
}

function getAgendaStatusBadge(agendaTime, now = new Date()) {
    const diffMs = agendaTime - now;

    if (diffMs <= -AGENDA_FINISHED_THRESHOLD_MS) {
        return '<span class="badge bg-success px-2 py-1"><i class="fa-solid fa-circle-check me-1"></i>Sudah Selesai</span>';
    }

    if (diffMs < 0) {
        return '<span class="badge bg-danger px-2 py-1"><i class="fa-solid fa-play me-1"></i>Sedang Berlangsung</span>';
    }

    const totalMin = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    return `<span class="text-primary fw-bold realtime-countdown"><i class="fa-solid fa-hourglass-half me-1"></i>${hours}j ${mins}m</span>`;
}

function getNearestUpcomingAgenda(now = new Date()) {
    return agendas
        .map(agenda => ({ ...agenda, agendaTime: getAgendaDate(agenda) }))
        .filter(agenda => agenda.agendaTime >= now)
        .sort((a, b) => a.agendaTime - b.agendaTime)[0] || null;
}

function renderNearestCountdown() {
    const title = document.getElementById('nearestAgendaTitle');
    const meta = document.getElementById('nearestAgendaMeta');
    const partsEl = document.getElementById('nearestCountdownParts');
    const hint = document.getElementById('nearestAgendaHint');
    if (!title || !meta || !partsEl) return;

    const now = new Date();
    const nearest = getNearestUpcomingAgenda(now);

    if (!nearest) {
        title.textContent = 'Belum ada agenda mendatang';
        meta.textContent = 'Tambahkan agenda baru atau ubah filter untuk melihat jadwal lain.';
        partsEl.innerHTML = `
            <div><strong>--</strong><span>Hari</span></div>
            <div><strong>--</strong><span>Jam</span></div>
            <div><strong>--</strong><span>Menit</span></div>
            <div><strong>--</strong><span>Detik</span></div>`;
        if (hint) hint.textContent = 'Voice otomatis menunggu agenda terdekat berikutnya.';
        return;
    }

    const diffMs = nearest.agendaTime - now;
    const duration = formatDurationParts(diffMs);
    const formatTgl = nearest.agendaTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const formatJam = nearest.agendaTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    title.textContent = nearest.nama;
    meta.innerHTML = `<i class="fa-solid fa-calendar-clock text-primary me-1"></i>${formatTgl}, pukul ${formatJam} • <i class="fa-solid fa-location-dot text-danger me-1"></i>${escapeHtml(nearest.lokasi)}`;
    partsEl.innerHTML = `
        <div><strong>${duration.days}</strong><span>Hari</span></div>
        <div><strong>${String(duration.hours).padStart(2, '0')}</strong><span>Jam</span></div>
        <div><strong>${String(duration.minutes).padStart(2, '0')}</strong><span>Menit</span></div>
        <div><strong>${String(duration.seconds).padStart(2, '0')}</strong><span>Detik</span></div>`;

    if (hint) {
        hint.textContent = audioEnabled
            ? 'Voice otomatis siap berbunyi pada H-30 menit, H-10 menit, dan saat agenda mulai.'
            : 'Klik tombol Aktifkan Suara agar voice otomatis dapat berbunyi pada H-30 menit, H-10 menit, dan saat agenda mulai.';
    }
}

function processAutomaticVoiceNotifications() {
    const now = new Date();

    agendas.forEach(agenda => {
        const secondsUntil = Math.floor((getAgendaDate(agenda) - now) / 1000);

        if(secondsUntil <= 1800 && secondsUntil > 600 && !Number(agenda.notified30)) {
            if (playAudio(agenda.nama, agenda.lokasi, agenda.peserta, 'Akan dimulai dalam tiga puluh menit lagi')) {
                markNotificationSent(agenda.id, '30');
            }
        }
        if(secondsUntil <= 600 && secondsUntil > 0 && !Number(agenda.notified10)) {
            if (playAudio(agenda.nama, agenda.lokasi, agenda.peserta, 'Akan dimulai dalam sepuluh menit lagi')) {
                markNotificationSent(agenda.id, '10');
            }
        }
        if(secondsUntil <= 0 && secondsUntil >= -1800 && !Number(agenda.notified0)) {
            if (playAudio(agenda.nama, agenda.lokasi, agenda.peserta, 'Sekarang saatnya pelaksanaan agenda tersebut. Sedang berlangsung')) {
                markNotificationSent(agenda.id, '0');
            }
        }
    });
}

function renderTable() {
    const tbody = document.getElementById('agendaTableBody');
    if (!tbody) return;

    const filtered = agendas.filter(agenda => {
        const agendaDate = getAgendaDate(agenda);
        if(selectedDate) {
            return agendaDate.getDate() === selectedDate.getDate()
                && agendaDate.getMonth() === selectedDate.getMonth()
                && agendaDate.getFullYear() === selectedDate.getFullYear();
        }
        if(currentFilter === 'today') {
            return agendaDate.toDateString() === new Date().toDateString();
        }
        return true;
    });

    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Tidak ada agenda kerja yang terjadwal.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(agenda => {
        const agendaTime = getAgendaDate(agenda);
        const statusBadge = getAgendaStatusBadge(agendaTime);

        const formatTgl = agendaTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
        const formatJam = agendaTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const editButton = adminSession.loggedIn
            ? `<button class="btn btn-sm btn-info text-white" onclick="editAgenda(${Number(agenda.id)})" title="Edit Data"><i class="fa-solid fa-pen-to-square"></i></button>`
            : '';
        const deleteButton = adminSession.loggedIn
            ? `<button class="btn btn-sm btn-danger" onclick="deleteAgenda(${Number(agenda.id)})" title="Hapus"><i class="fa-solid fa-trash"></i></button>`
            : '';

        return `<tr>
            <td><strong>${formatTgl}</strong><br><span class="text-primary fw-bold">Pukul ${formatJam}</span></td>
            <td>
                <div class="fw-bold text-dark">${escapeHtml(agenda.nama)}</div>
                <div class="small text-muted"><i class="fa-solid fa-location-dot text-danger me-1"></i> ${escapeHtml(agenda.lokasi)}</div>
                <div class="small text-muted"><i class="fa-solid fa-users text-success me-1"></i> Hadir: ${escapeHtml(agenda.peserta)}</div>
            </td>
            <td>${statusBadge}</td>
            <td class="text-end">
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-warning text-white" onclick="manualTrigger(${Number(agenda.id)})" title="Picu Pembacaan Suara"><i class="fa-solid fa-bullhorn"></i></button>
                    ${editButton}
                    ${deleteButton}
                </div>
            </td>
        </tr>`;
    }).join('');
}
