/* ==================================================
   JALAN SANTAI 2026 — SCRIPT.JS
   Fathona Festival Performing Art
================================================== */

"use strict";

/* ============ KONFIGURASI ============ */
const ADMIN_PASSWORD = "ulayya01";
const STORAGE_KEY    = "jalanSantai2026_participants";
const COUNTER_KEY    = "jalanSantai2026_counter";
const MAX_FILE_SIZE  = 5 * 1024 * 1024; // 5 MB

/* ============ STATE ============ */
const uploadedFiles = {
  instagram: null,
  tiktok: null,
  youtube: null,
  photo: null,
};

let currentParticipant = null;

/* ============ HELPERS ============ */
const $ = (id) => document.getElementById(id);

function formatDateID(iso) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function isToday(iso) {
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

/* ============ KOMPRESI GAMBAR ============ */
function compressImage(file, maxDim = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("File bukan gambar."));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width  = Math.round(width  * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        try {
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (err) { reject(err); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ============ STORAGE ============ */
function loadParticipants() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveParticipants(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error(e);
    throw new Error(
      "Penyimpanan browser penuh. Silakan ekspor data lama lalu hapus sebagian."
    );
  }
}

function nextTicketNumber() {
  const counter = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(counter));
  return "FS-" + String(counter).padStart(3, "0");
}

/* ============ PESAN FORM ============ */
function showFormMessage(text, type = "error") {
  const el = $("formMessage");
  if (!el) return;
  el.className = "form-message " + type;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(showFormMessage._t);
  showFormMessage._t = setTimeout(() => { el.hidden = true; }, 6000);
}

/* ============ UPLOAD FILE ============ */
function setupFileInput({ inputId, previewId, imgId, key }) {
  const input   = $(inputId);
  const preview = $(previewId);
  const img     = $(imgId);
  if (!input || !preview || !img) return;

  input.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showFormMessage("❌ File harus berupa gambar (JPG/PNG/WEBP).");
      input.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showFormMessage("❌ Ukuran file melebihi 5 MB.");
      input.value = "";
      return;
    }

    try {
      const compressed = await compressImage(file, key === "photo" ? 700 : 1000, 0.72);
      uploadedFiles[key] = compressed;
      img.src = compressed;
      preview.hidden = false;
    } catch (err) {
      console.error(err);
      showFormMessage("❌ Gagal memproses gambar.");
      input.value = "";
    }
  });

  // Tombol hapus
  const removeBtn = preview.querySelector("[data-remove]");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      uploadedFiles[key] = null;
      input.value = "";
      img.src = "";
      preview.hidden = true;
    });
  }
}

function resetUploads() {
  ["instagram", "tiktok", "youtube", "photo"].forEach((k) => {
    uploadedFiles[k] = null;
    const input   = document.querySelector(`[data-remove="${k}"]`)?.closest(".photo-preview")
                    ?.previousElementSibling?.querySelector("input[type=file]");
    const preview = document.querySelector(`[data-remove="${k}"]`)?.closest(".photo-preview");
    const img     = preview?.querySelector("img");
    if (img) img.src = "";
    if (preview) preview.hidden = true;
    if (input) input.value = "";
  });
}

/* ============ REGISTER ============ */
async function handleRegister(event) {
  event.preventDefault();

  const btn       = $("btnSubmitForm");
  const btnText   = $("submitButtonText");
  const form      = $("registrationForm");

  // Validasi dasar
  if (!form.checkValidity()) {
    form.reportValidity();
    showFormMessage("⚠️ Mohon lengkapi seluruh field bertanda wajib.");
    return;
  }

  const nama       = $("nama").value.trim();
  const whatsapp   = $("whatsapp").value.trim();
  const alamat     = $("alamat").value.trim();
  const gender     = $("jenisKelamin").value;
  const komunitas  = $("komunitas").value.trim() || "Individu";
  const quote      = $("kataHariIni").value.trim();

  // Validasi tambahan
  if (nama.length < 3) {
    showFormMessage("⚠️ Nama minimal 3 karakter."); return;
  }
  if (!/^[0-9+\-\s()]{8,20}$/.test(whatsapp)) {
    showFormMessage("⚠️ Format nomor WhatsApp tidak valid."); return;
  }
  if (!uploadedFiles.photo) {
    showFormMessage("⚠️ Foto peserta wajib diunggah."); return;
  }
  if (!uploadedFiles.instagram) {
    showFormMessage("⚠️ Bukti follow Instagram wajib diunggah."); return;
  }
  if (!uploadedFiles.tiktok) {
    showFormMessage("⚠️ Bukti follow TikTok wajib diunggah."); return;
  }
  if (!uploadedFiles.youtube) {
    showFormMessage("⚠️ Bukti follow YouTube wajib diunggah."); return;
  }

  btn.disabled = true;
  btnText.textContent = "Memproses pendaftaran…";

  try {
    const ticketNumber = nextTicketNumber();

    const participant = {
      id: ticketNumber,
      ticketNumber,
      nama, whatsapp, alamat,
      gender, komunitas, quote,
      photo:        uploadedFiles.photo,
      proofInstagram: uploadedFiles.instagram,
      proofTiktok:    uploadedFiles.tiktok,
      proofYoutube:   uploadedFiles.youtube,
      registeredAt: new Date().toISOString(),
    };

    const list = loadParticipants();
    list.push(participant);
    saveParticipants(list);

    currentParticipant = participant;
    showTicket(participant);

    // Reset form
    form.reset();
    resetUploads();
    $("kataHariIniCounter").textContent = "0/180";
    showFormMessage("✅ Pendaftaran berhasil! Tiket telah diterbitkan.", "success");
  } catch (err) {
    console.error(err);
    showFormMessage("❌ " + (err.message || "Terjadi kesalahan saat menyimpan."));
  } finally {
    btn.disabled = false;
    btnText.textContent = "Daftar & Terbitkan Tiket →";
  }
}

/* ============ TIKET ============ */
function showTicket(p) {
  $("ticketName").textContent     = p.nama;
  $("ticketNumber").textContent   = p.ticketNumber;
  $("ticketGender").textContent   = p.gender || "-";
  $("ticketCommunity").textContent = p.komunitas || "Individu";
  $("ticketQuote").textContent    = p.quote || "Langkah kecil, semangat besar!";
  $("ticketLocation").textContent = "Jl. Jepang, Karya Baru, Palembang";

  const photo = $("ticketPhoto");
  if (p.photo) {
    photo.src = p.photo;
    photo.style.display = "";
  } else {
    photo.style.display = "none";
  }

  const modal = $("ticketModal");
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeTicket() {
  $("ticketModal").hidden = true;
  document.body.style.overflow = "";
}

function saveTicket() {
  window.print();
}

function sendTicketWhatsApp() {
  if (!currentParticipant) return;
  const p = currentParticipant;
  const text =
    `🎟️ *TIKET RESMI PESERTA*\n` +
    `*Jalan Santai 2026 — Fathona Festival Performing Art*\n\n` +
    `👤 Nama: ${p.nama}\n` +
    `🔢 No. Registrasi: ${p.ticketNumber}\n` +
    `⚧ Jenis Kelamin: ${p.gender}\n` +
    `🏫 Instansi/Komunitas: ${p.komunitas}\n` +
    `✨ Kata-Kata Hari Ini: "${p.quote}"\n\n` +
    `📍 Lokasi: Jl. Jepang, Karya Baru, Alang-Alang Lebar, Palembang\n\n` +
    `Status: ✓ PESERTA TERDAFTAR`;

  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
}

/* ============ ADMIN LOGIN ============ */
function openAdminLogin() {
  $("adminLoginModal").hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => $("adminPassword")?.focus(), 100);
}

function closeAdminLogin() {
  $("adminLoginModal").hidden = true;
  document.body.style.overflow = "";
  $("adminLoginForm")?.reset();
  $("adminLoginMessage").hidden = true;
}

function handleAdminLogin(event) {
  event.preventDefault();
  const msg = $("adminLoginMessage");
  const pwd = $("adminPassword").value;

  if (pwd === ADMIN_PASSWORD) {
    msg.className = "form-message success";
    msg.textContent = "✅ Login berhasil. Membuka dashboard…";
    msg.hidden = false;
    setTimeout(() => {
      closeAdminLogin();
      openAdminDashboard();
    }, 500);
  } else {
    msg.className = "form-message error";
    msg.textContent = "❌ Password salah. Coba lagi.";
    msg.hidden = false;
  }
}

/* ============ ADMIN DASHBOARD ============ */
function openAdminDashboard() {
  $("adminDashboard").hidden = false;
  $("mainContent").hidden    = true;
  $("siteFooter").hidden     = true;
  document.querySelector(".site-header").style.display = "none";
  document.body.style.overflow = "";
  window.scrollTo({ top: 0, behavior: "auto" });
  renderAdminTable();
}

function closeAdminDashboard() {
  $("adminDashboard").hidden = true;
  $("mainContent").hidden    = false;
  $("siteFooter").hidden     = false;
  document.querySelector(".site-header").style.display = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAdminTable() {
  const tbody = $("adminParticipantsBody");
  const list  = loadParticipants();

  // Statistik
  $("adminTotalPeserta").textContent   = list.length;
  $("adminPesertaHariIni").textContent = list.filter((p) => isToday(p.registeredAt)).length;

  // Filter pencarian
  const q = ($("adminSearch")?.value || "").toLowerCase().trim();
  const filtered = q
    ? list.filter((p) =>
        (p.nama || "").toLowerCase().includes(q) ||
        (p.ticketNumber || "").toLowerCase().includes(q) ||
        (p.whatsapp || "").toLowerCase().includes(q))
    : list;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8">${q ? "Tidak ada peserta yang cocok." : "Belum ada data peserta."}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .slice()
    .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt))
    .map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(p.ticketNumber)}</strong></td>
        <td>${escapeHtml(p.nama)}</td>
        <td>${escapeHtml(p.whatsapp)}</td>
        <td>${escapeHtml(p.gender || "-")}</td>
        <td>${escapeHtml(p.komunitas || "Individu")}</td>
        <td><button type="button" class="btn-mini" data-proof-id="${escapeHtml(p.ticketNumber)}">🔍 Lihat</button></td>
        <td>${escapeHtml(formatDateID(p.registeredAt))}</td>
      </tr>
    `).join("");

  // Pasang handler tombol "Lihat"
  tbody.querySelectorAll("[data-proof-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.proofId;
      const p = loadParticipants().find((x) => x.ticketNumber === id);
      if (p) openProofModal(p);
    });
  });
}

/* ============ MODAL BUKTI ============ */
function openProofModal(p) {
  $("proofTitle").textContent    = p.nama;
  $("proofSubtitle").textContent = `${p.ticketNumber} • ${formatDateID(p.registeredAt)}`;
  $("proofInstagram").src = p.proofInstagram || "";
  $("proofTiktok").src    = p.proofTiktok    || "";
  $("proofYoutube").src   = p.proofYoutube   || "";
  $("proofModal").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeProofModal() {
  $("proofModal").hidden = true;
  document.body.style.overflow = "";
}

/* ============ EKSPOR EXCEL ============ */
function exportExcel() {
  const list = loadParticipants();
  if (!list.length) { alert("Belum ada data peserta untuk diekspor."); return; }
  if (typeof XLSX === "undefined") { alert("Pustaka Excel belum siap. Coba lagi sebentar."); return; }

  const rows = list.map((p, i) => ({
    "No.": i + 1,
    "No. Registrasi": p.ticketNumber,
    "Nama Lengkap": p.nama,
    "WhatsApp": p.whatsapp,
    "Alamat": p.alamat,
    "Jenis Kelamin": p.gender,
    "Instansi/Komunitas": p.komunitas,
    "Kata-Kata Hari Ini": p.quote,
    "Bukti IG":  p.proofInstagram ? "Ada" : "Tidak ada",
    "Bukti TikTok": p.proofTiktok ? "Ada" : "Tidak ada",
    "Bukti YouTube": p.proofYoutube ? "Ada" : "Tidak ada",
    "Tanggal Daftar": formatDateID(p.registeredAt),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 5 }, { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 35 },
    { wch: 14 }, { wch: 22 }, { wch: 32 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Peserta");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Peserta_JalanSantai2026_${today}.xlsx`);
}

/* ============ INIT ============ */
document.addEventListener("DOMContentLoaded", () => {

  /* Mobile menu */
  const menuButton = $("btnMobileMenu");
  const nav = document.querySelector(".main-nav");
  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        menuButton.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Counter kata hari ini */
  const quoteInput   = $("kataHariIni");
  const quoteCounter = $("kataHariIniCounter");
  if (quoteInput && quoteCounter) {
    const update = () => { quoteCounter.textContent = `${quoteInput.value.length}/180`; };
    quoteInput.addEventListener("input", update);
    update();
  }

  /* Back to top */
  const backToTop = $("btnBackToTop");
  if (backToTop) {
    window.addEventListener("scroll", () => { backToTop.hidden = window.scrollY < 400; });
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* Upload file handlers */
  setupFileInput({ inputId: "buktiInstagram", previewId: "previewInstagram", imgId: "previewInstagramImg", key: "instagram" });
  setupFileInput({ inputId: "buktiTiktok",    previewId: "previewTiktok",    imgId: "previewTiktokImg",    key: "tiktok" });
  setupFileInput({ inputId: "buktiYoutube",   previewId: "previewYoutube",   imgId: "previewYoutubeImg",   key: "youtube" });
  setupFileInput({ inputId: "fotoPeserta",    previewId: "previewFoto",      imgId: "previewFotoImg",      key: "photo" });

  /* Form submit */
  $("registrationForm")?.addEventListener("submit", handleRegister);

  /* Ticket modal */
  $("btnCloseTicket")?.addEventListener("click", closeTicket);
  $("btnCloseTicketSecondary")?.addEventListener("click", closeTicket);
  $("btnSaveTicket")?.addEventListener("click", saveTicket);
  $("btnTicketWhatsApp")?.addEventListener("click", sendTicketWhatsApp);

  /* Admin */
  $("btnOpenAdminLogin")?.addEventListener("click", openAdminLogin);
  $("btnCloseAdminLogin")?.addEventListener("click", closeAdminLogin);
  $("adminLoginForm")?.addEventListener("submit", handleAdminLogin);
  $("btnCloseAdminDashboard")?.addEventListener("click", closeAdminDashboard);
  $("adminSearch")?.addEventListener("input", renderAdminTable);
  $("btnExportExcel")?.addEventListener("click", exportExcel);

  /* Proof modal */
  $("btnCloseProof")?.addEventListener("click", closeProofModal);

  /* ESC untuk tutup modal */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("ticketModal").hidden)     closeTicket();
    if (!$("adminLoginModal").hidden) closeAdminLogin();
    if (!$("proofModal").hidden)      closeProofModal();
  });

  /* Klik overlay = tutup */
  ["ticketModal", "adminLoginModal", "proofModal"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      if (e.target !== el) return;
      if (id === "ticketModal")     closeTicket();
      if (id === "adminLoginModal") closeAdminLogin();
      if (id === "proofModal")      closeProofModal();
    });
  });
});

/* Expose ke window agar onclick inline juga bisa */
window.handleRegister = handleRegister;