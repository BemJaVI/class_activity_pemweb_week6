// mock-api.js
(function() {
    let mode = "normal"; // normal, offline, lambat

    // Expose __API global object untuk pengujian di Console
    window.__API = {
        setMode: function(newMode) {
            mode = newMode;
            console.log(`[Mock API] Mode diubah menjadi: ${mode}`);
        }
    };

    // Simpan referensi fetch asli
    const originalFetch = window.fetch;

    // Database dummy
    let db = {
        matkul: [
            { id: "1", nama: "Pemrograman Web" },
            { id: "2", nama: "Struktur Data" },
            { id: "3", nama: "Basis Data" }
        ],
        tugas: [
            { id: "1", judul: "Lab 10 event delegation", matkulId: "1", matkul: "Pemrograman Web", deadline: "2026-10-08", selesai: false },
            { id: "2", judul: "Ringkasan materi async/await", matkulId: "1", matkul: "Pemrograman Web", deadline: "2026-10-10", selesai: false }
        ]
    };

    // Intercept (Cegat) pemanggilan fetch
    window.fetch = async function(url, options = {}) {
        // Simulasi delay untuk mode "lambat"
        if (mode === "lambat") {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Simulasi network error untuk mode "offline"
        if (mode === "offline") {
            throw new TypeError("Failed to fetch"); 
        }

        const method = (options.method || "GET").toUpperCase();
        
        const createResponse = (body, status = 200) => {
            return new Response(JSON.stringify(body), {
                status: status,
                headers: { 'Content-Type': 'application/json' }
            });
        };

        try {
            // Endpoint Mata Kuliah
            if (url.includes('/api/matkul') && method === "GET") {
                return createResponse(db.matkul);
            }

            // Endpoint Tugas
            if (url.includes('/api/tugas')) {
                if (method === "GET") return createResponse(db.tugas);
                
                if (method === "POST") {
                    const body = JSON.parse(options.body);
                    if (!body.judul || body.judul.length < 3) {
                        return createResponse({ message: "Judul tugas minimal 3 karakter" }, 400);
                    }
                    const matkulObj = db.matkul.find(m => m.id === body.matkulId) || { nama: "Tidak Diketahui" };
                    const newTask = {
                        id: Date.now().toString(),
                        judul: body.judul,
                        matkulId: body.matkulId,
                        matkul: matkulObj.nama,
                        deadline: body.deadline,
                        selesai: false
                    };
                    db.tugas.push(newTask);
                    return createResponse(newTask, 201);
                }

                if (method === "PATCH") {
                    const id = url.split('/').pop();
                    const body = JSON.parse(options.body);
                    const taskIndex = db.tugas.findIndex(t => String(t.id) === String(id));
                    
                    if (taskIndex !== -1) {
                        db.tugas[taskIndex] = { ...db.tugas[taskIndex], ...body };
                        return createResponse(db.tugas[taskIndex]);
                    }
                    return createResponse({ message: "Tugas tidak ditemukan" }, 404);
                }

                if (method === "DELETE") {
                    const id = url.split('/').pop();
                    db.tugas = db.tugas.filter(t => String(t.id) !== String(id));
                    return new Response(null, { status: 204 });
                }
            }

            // Jika endpoint tidak dikenali, teruskan ke fetch asli
            return originalFetch(url, options);

        } catch (error) {
            console.error("[Mock API] Internal Error", error);
            return createResponse({ message: "Internal Server Error" }, 500);
        }
    };
})();