// State Global
let tasks = [];
let courses = [];

// Elemen DOM
const taskList = document.getElementById('task-list');
const uiState = document.getElementById('ui-state');
const taskForm = document.getElementById('task-form');
const courseSelect = document.getElementById('course-select');
const submitBtn = document.getElementById('submit-btn');
const errorMsgContainer = document.getElementById('error-message');

// --- 04 Helper api() ---
// Mengecek res.ok dan melempar Error berisi pesan server
async function api(endpoint, options = {}) {
    const res = await fetch(endpoint, options);
    
    if (!res.ok) {
        // Ambil pesan error dari server (misal status 400)
        let errorData = { message: 'Terjadi kesalahan pada server' };
        try {
            errorData = await res.json();
        } catch (e) {
            // Jika response bukan JSON
        }
        throw new Error(errorData.message || `HTTP Error: ${res.status}`);
    }

    // Tangani 204 No Content (DELETE) agar tidak parse JSON
    if (res.status === 204) {
        return null; 
    }
    
    return res.json();
}

// --- 01 & 05 Muat dari Server & Paralel ---
async function initData() {
    renderState('loading');
    
    try {
        // Menggunakan Promise.all untuk request independen secara paralel
        const [tasksData, coursesData] = await Promise.all([
            api('/api/tugas'),
            api('/api/matkul') // Sesuaikan endpoint mata kuliah dari Mock API
        ]);
        
        tasks = tasksData;
        courses = coursesData;
        
        renderCourses();
        renderTasks();
    } catch (error) {
        renderState('error', error.message);
    }
}

// Render Opsi Mata Kuliah
function renderCourses() {
    courseSelect.innerHTML = '<option value="">Pilih Mata Kuliah...</option>';
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.nama;
        courseSelect.appendChild(option);
    });
}

// Render UI State (loading, error, kosong)
function renderState(state, message = '') {
    taskList.innerHTML = ''; // Kosongkan list
    if (state === 'loading') {
        uiState.innerHTML = '<p>Memuat data dari server...</p>';
    } else if (state === 'error') {
        uiState.innerHTML = `
            <p style="color: red;">Gagal memuat: ${message}</p>
            <button onclick="initData()">Coba Lagi</button>
        `;
    } else if (state === 'kosong') {
        uiState.innerHTML = '<p>Belum ada tugas. Yay!</p>';
    } else {
        uiState.innerHTML = ''; // Clear state jika sukses ada data
    }
}

// Render List Tugas
function renderTasks() {
    if (tasks.length === 0) {
        renderState('kosong');
        return;
    }
    
    renderState('sukses');
    taskList.innerHTML = '';
    
    tasks.forEach(task => {
        const li = document.createElement('li');
        li.dataset.id = task.id;
        if (task.selesai) li.classList.add('completed');
        
        li.innerHTML = `
            <input type="checkbox" class="toggle-btn" ${task.selesai ? 'checked' : ''}>
            <div class="task-info">
                <strong>${task.judul}</strong>
                <small>${task.matkul} • deadline ${task.deadline}</small>
            </div>
            <button class="delete-btn">❌</button>
        `;
        taskList.appendChild(li);
    });
}

// --- 02 Tambah Data (POST) ---
taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Tombol nonaktif selama mengirim
    submitBtn.disabled = true;
    errorMsgContainer.classList.add('hidden');
    
    const newTask = {
        judul: document.getElementById('task-title').value,
        matkulId: courseSelect.value,
        deadline: document.getElementById('task-date').value,
        selesai: false
    };
    
    try {
        const response = await api('/api/tugas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });
        
        // Perbarui state lokal dan render ulang
        tasks.push(response);
        renderTasks();
        taskForm.reset();
    } catch (error) {
        // Tampilkan pesan error dari server (400)
        errorMsgContainer.textContent = error.message;
        errorMsgContainer.classList.remove('hidden');
    } finally {
        // Aktifkan kembali tombol
        submitBtn.disabled = false;
    }
});

// --- 03 Selesai & Hapus lewat Event Delegation ---
taskList.addEventListener('click', async (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    
    const id = li.dataset.id;
    
    // Hapus Tugas (DELETE)
    if (e.target.classList.contains('delete-btn')) {
        try {
            await api(`/api/tugas/${id}`, { method: 'DELETE' });
            // Perbarui state dari respons server
            tasks = tasks.filter(t => String(t.id) !== String(id));
            renderTasks();
        } catch (error) {
            console.error('Gagal menghapus:', error);
            alert('Gagal menghapus tugas: ' + error.message);
        }
    }
    
    // Toggle Selesai (PATCH)
    if (e.target.classList.contains('toggle-btn')) {
        const isCompleted = e.target.checked;
        try {
            const updatedTask = await api(`/api/tugas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selesai: isCompleted })
            });
            
            // Perbarui state lokal
            const taskIndex = tasks.findIndex(t => String(t.id) === String(id));
            if (taskIndex !== -1) tasks[taskIndex] = updatedTask;
            
            renderTasks();
        } catch (error) {
            // Kembalikan status checkbox jika server gagal
            e.target.checked = !isCompleted; 
            alert('Gagal mengupdate status: ' + error.message);
        }
    }
});

// Jalankan saat pertama kali dimuat
document.addEventListener('DOMContentLoaded', initData);