/* Data Hari Libur & Penting (Format: MM-DD) */
const holidaysData = [
    { date: "01-01", name: "Tahun Baru Masehi", isImportant: false },
    { date: "04-25", name: "Hari Otonomi Daerah", isImportant: true },
    { date: "05-01", name: "Hari Buruh Internasional", isImportant: false },
    { date: "05-02", name: "Hari Pendidikan Nasional", isImportant: true },
    { date: "06-01", name: "Hari Lahir Pancasila", isImportant: false },
    { date: "08-17", name: "Hari Kemerdekaan RI", isImportant: true },
    { date: "11-10", name: "Hari Pahlawan", isImportant: true },
    { date: "11-29", name: "HUT KORPRI", isImportant: true },
    { date: "12-25", name: "Hari Raya Natal", isImportant: false }
];

const API_URL = 'api.php';
let agendas = [];
let currentView = 'today';
let audioEnabled = false;
let adminSession = {
    loggedIn: Boolean(window.APP_SESSION?.loggedIn),
    adminName: window.APP_SESSION?.adminName || ''
};

window.speechSynthesis.onvoiceschanged = function() {
    window.speechSynthesis.getVoices();
};

document.addEventListener("DOMContentLoaded", () => {
    bindForms();
    renderAuthState();
    renderHolidays();
    checkTodayHoliday();
    loadSession();
    loadAgendas();
});

function bindForms() {
    document.getElementById('loginForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        await loginAdmin();
    });

    document.getElementById('agendaForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        await createAgenda(this);
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
    window.setTimeout(() => el.classList.add('d-none'), 4000);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
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
    const loginCard = document.getElementById('loginCard');
    const agendaCard = document.getElementById('agendaCard');
    const adminBadge = document.getElementById('adminBadge');
    const adminName = document.getElementById('adminName');
    const logoutBtn = document.getElementById('logoutBtn');

    loginCard?.classList.toggle('d-none', adminSession.loggedIn);
    agendaCard?.classList.toggle('d-none', !adminSession.loggedIn);
    adminBadge?.classList.toggle('d-none', !adminSession.loggedIn);
    logoutBtn?.classList.toggle('d-none', !adminSession.loggedIn);

    if (adminName) {
        adminName.textContent = adminSession.adminName || 'Admin';
    }

    renderTable();
}

async function loginAdmin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const data = await apiRequest('login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        adminSession = { loggedIn: true, adminName: data.adminName || 'Admin' };
        document.getElementById('loginForm').reset();
        renderAuthState();
        showMessage(data.message || 'Login berhasil.', 'success');
    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

async function logoutAdmin() {
    try {
        const data = await apiRequest('logout', { method: 'POST', body: JSON.stringify({}) });
        adminSession = { loggedIn: false, adminName: '' };
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
    } catch (error) {
        agendas = [];
        renderTable();
        showMessage(error.message, 'danger');
    }
}

async function createAgenda(form) {
    if (!adminSession.loggedIn) {
        showMessage('Silakan login sebagai admin untuk menambah agenda.', 'warning');
        return;
    }

    const payload = {
        nama: document.getElementById('nama').value,
        lokasi: document.getElementById('lokasi').value,
        peserta: document.getElementById('peserta').value,
        waktu: document.getElementById('waktu').value
    };

    try {
        const data = await apiRequest('agendas', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        agendas = data.agendas || [];
        form.reset();
        renderTable();
        showMessage(data.message || 'Agenda berhasil disimpan.', 'success');
    } catch (error) {
        showMessage(error.message, 'danger');
    }
}

async function deleteAgenda(id) {
    if (!adminSession.loggedIn) {
        showMessage('Silakan login sebagai admin untuk menghapus agenda.', 'warning');
        return;
    }

    if(confirm("Hapus agenda ini secara permanen?")) {
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
    renderTable();
}

function initAudio() {
    window.speechSynthesis.resume();
    const synth = window.speechSynthesis;
    const utterThis = new SpeechSynthesisUtterance("Sistem notifikasi suara BPKD Ciamis telah aktif.");
    utterThis.lang = 'id-ID';
    utterThis.volume = 1;
    synth.speak(utterThis);

    audioEnabled = true;

    const btn = document.getElementById('initAudioBtn');
    btn.innerHTML = "<i class='fa-solid fa-check-circle me-1'></i> Suara Aktif";
    btn.classList.add('active');
    btn.classList.remove('btn-audio-init');
    btn.classList.add('btn-primary');
}

function stopAudio() {
    window.speechSynthesis.cancel();
}

function playNotification(nama, lokasi, peserta, keteranganWaktu) {
    if (!audioEnabled) {
        alert(`ALARM: Agenda "${nama}"\nStatus: ${keteranganWaktu || "Pengingat Manual"}\n\n*Suara ditahan karena belum klik Izinkan Suara.`);
        return;
    }
    window.speechSynthesis.resume();
    const synth = window.speechSynthesis;
    const tambahanWaktu = keteranganWaktu ? ` ${keteranganWaktu}.` : "";
    const textToSpeak = `Mohon perhatian. Mengingatkan agenda ${nama}. Bertempat di ${lokasi}. Bersama ${peserta}.${tambahanWaktu}`;

    const utterThis = new SpeechSynthesisUtterance(textToSpeak);
    utterThis.lang = 'id-ID';
    utterThis.rate = 0.9;
    utterThis.volume = 1;

    const voices = synth.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
    if(idVoice) utterThis.voice = idVoice;

    synth.speak(utterThis);
}

function triggerManualVoice(id) {
    const agenda = agendas.find(a => Number(a.id) === Number(id));
    if (agenda) playNotification(agenda.nama, agenda.lokasi, agenda.peserta, "");
}

// Scheduler Otomatis 1 Detik
setInterval(() => {
    const now = new Date();
    if (now.getSeconds() === 0) {
        agendas.forEach(agenda => {
            const agendaTime = new Date(agenda.waktu);
            const diffMs = agendaTime - now;
            const diffMins = Math.round(diffMs / 60000);

            if (diffMins === 30 && !agenda.notified30) {
                playNotification(agenda.nama, agenda.lokasi, agenda.peserta, "Akan dimulai dalam tiga puluh menit lagi");
                markNotificationSent(agenda.id, '30');
            }
            if (diffMins === 10 && !agenda.notified10) {
                playNotification(agenda.nama, agenda.lokasi, agenda.peserta, "Akan segera dimulai dalam sepuluh menit lagi");
                markNotificationSent(agenda.id, '10');
            }
            if (diffMins === 0 && !agenda.notified0) {
                playNotification(agenda.nama, agenda.lokasi, agenda.peserta, "Sekarang adalah waktu pelaksanaan agenda tersebut. Sedang berlangsung");
                markNotificationSent(agenda.id, '0');
            }
        });
    }
}, 1000);

function checkTodayHoliday() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayFormatted = `${month}-${day}`;

    const todayHoliday = holidaysData.find(h => h.date === todayFormatted);
    if(todayHoliday) {
        document.getElementById('holidayBanner').style.display = 'block';
        document.getElementById('holidayBannerText').innerText = todayHoliday.name;
        document.getElementById('holidayBannerTitle').innerText = todayHoliday.isImportant ? "Peringatan Hari Penting:" : "Peringatan Hari Libur:";
    }
}

function renderHolidays() {
    const container = document.getElementById('holidayListContainer');
    container.innerHTML = '';
    const sortedHolidays = [...holidaysData].sort((a,b) => a.date.localeCompare(b.date));

    sortedHolidays.forEach(h => {
        const [m, d] = h.date.split('-');
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
        const displayDate = `${parseInt(d)} ${monthNames[parseInt(m)-1]}`;

        const cssClass = h.isImportant ? "text-important" : "holiday-name";
        const icon = h.isImportant ? "<i class='fa-solid fa-star text-warning me-1'></i>" : "<i class='fa-solid fa-circle-dot text-danger me-1' style='font-size:0.5rem;'></i>";

        container.innerHTML += `
            <div class="holiday-item d-flex justify-content-between align-items-center">
                <div>${icon} <span class="${cssClass}">${escapeHtml(h.name)}</span></div>
                <span class="holiday-date">${displayDate}</span>
            </div>
        `;
    });
}

function switchTab(tab) {
    currentView = tab;
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById('agendaTableBody');
    const emptyState = document.getElementById('emptyState');
    if (!tbody || !emptyState) return;

    tbody.innerHTML = '';

    const now = new Date();
    const todayStr = now.toDateString();

    let dataToShow = agendas.filter(agenda => {
        if (currentView === 'today') return new Date(agenda.waktu).toDateString() === todayStr;
        return true;
    });

    if (dataToShow.length === 0) {
        emptyState.style.display = 'block';
        document.querySelector('.table-responsive table').style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    document.querySelector('.table-responsive table').style.display = 'table';

    dataToShow.forEach(agenda => {
        const agendaTime = new Date(agenda.waktu);
        const formatTgl = agendaTime.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
        const formatJam = agendaTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const stat30 = agenda.notified30 ? 'badge-done' : 'badge-pending';
        const stat10 = agenda.notified10 ? 'badge-done' : 'badge-pending';
        const stat0  = agenda.notified0 ? 'badge-done' : 'badge-pending';
        const deleteButton = adminSession.loggedIn
            ? `<button class="btn btn-sm btn-danger" onclick="deleteAgenda(${Number(agenda.id)})" title="Hapus Data"><i class="fa-solid fa-trash-can"></i></button>`
            : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4">
                <div class="fw-bold text-dark">${formatTgl}</div>
                <div class="text-primary fw-bold mt-1"><i class="fa-regular fa-clock me-1"></i>${formatJam}</div>
            </td>
            <td>
                <div class="fw-bold fs-6 mb-1">${escapeHtml(agenda.nama)}</div>
                <div class="small text-muted mb-1"><i class="fa-solid fa-location-dot me-1 text-danger"></i> ${escapeHtml(agenda.lokasi)}</div>
                <div class="small text-muted"><i class="fa-solid fa-users me-1 text-success"></i> ${escapeHtml(agenda.peserta)}</div>
            </td>
            <td>
                <div class="d-flex gap-1 flex-wrap">
                    <span class="badge-status ${stat30}">-30m</span>
                    <span class="badge-status ${stat10}">-10m</span>
                    <span class="badge-status ${stat0}">Play</span>
                </div>
            </td>
            <td class="pe-4 text-end">
                <div class="btn-group shadow-sm">
                    <button class="btn btn-sm btn-warning text-white" onclick="triggerManualVoice(${Number(agenda.id)})" title="Tes Suara">
                        <i class="fa-solid fa-bullhorn"></i>
                    </button>
                    ${deleteButton}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
