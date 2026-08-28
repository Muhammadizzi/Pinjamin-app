/**
 * Kamus teks UI — satu entri per kunci, pasangan `[Indonesia, English]`.
 *
 * Kenapa satu objek (bukan dua objek `id` & `en` terpisah): dengan format
 * pasangan, terjemahan selalu bersebelahan dan mustahil ada kunci yang cuma
 * punya salah satu bahasa. TypeScript ikut menjaga: tiap entri wajib tuple
 * dua string.
 *
 * Placeholder memakai kurung kurawal, mis. `"{count} aset"`, diisi lewat
 * argumen kedua `t()`: `t("assetCount", { count: 3 })`.
 */
export const messages = {
  // ---------- Navigasi & kerangka ----------
  home: ["Home", "Home"],
  assets: ["Aset", "Assets"],
  categories: ["Kategori", "Categories"],
  tags: ["Tag", "Tags"],
  locations: ["Lokasi", "Locations"],
  reports: ["Laporan", "Reports"],
  accountSetting: ["Pengaturan Akun", "Account Settings"],
  logOut: ["Keluar", "Log Out"],
  profile: ["Profil", "Profile"],
  fullName: ["Nama Lengkap", "Full Name"],
  profilePicture: ["Foto Profil", "Profile Picture"],
  assetManagement: ["Manajemen Aset", "Asset Management"],
  helpdesk: ["Helpdesk", "Helpdesk"],
  helpdeskTickets: ["Tiket Bantuan", "Support Tickets"],
  sidebarHelpdeskHint: [
    "Tiket masuk dari landing page tanpa login. Ubah statusnya agar user bisa melacak lewat nomor tiket.",
    "Tickets arrive from the landing page without login. Update the status so users can track it by ticket number.",
  ],
  tips: ["Tips", "Tips"],
  sidebarScanHint: [
    "Scan QR aset untuk aksi cepat pinjam/kembali tanpa buka menu.",
    "Scan an asset QR for quick check-out/return without opening the menu.",
  ],
  systemActive: ["Sistem aktif", "System online"],

  // ---------- Umum ----------
  add: ["Tambah", "Add"],
  edit: ["Ubah", "Edit"],
  delete: ["Hapus", "Delete"],
  save: ["Simpan", "Save"],
  cancel: ["Batal", "Cancel"],
  close: ["Tutup", "Close"],
  update: ["Perbarui", "Update"],
  detail: ["Detail", "Detail"],
  back: ["Kembali", "Back"],
  status: ["Status", "Status"],
  name: ["Nama", "Name"],
  description: ["Deskripsi", "Description"],
  category: ["Kategori", "Category"],
  location: ["Lokasi", "Location"],
  custodian: ["Peminjam", "Custodian"],
  value: ["Nilai", "Value"],
  serialNumber: ["Serial Number", "Serial Number"],
  actions: ["Aksi", "Actions"],
  saving: ["Menyimpan...", "Saving..."],
  color: ["Warna", "Color"],
  preview: ["Pratinjau", "Preview"],
  all: ["Semua", "All"],
  none: ["Tidak ada", "None"],
  selectPlaceholder: ["— Pilih —", "— Select —"],
  yesSave: ["Ya, Simpan", "Yes, Save"],
  yesAdd: ["Ya, Tambah", "Yes, Add"],
  yesDelete: ["Ya, Hapus", "Yes, Delete"],
  yesContinue: ["Ya, Lanjutkan", "Yes, Continue"],
  closeDialog: ["Tutup dialog", "Close dialog"],
  totalAsset: ["Total Aset", "Total Assets"],
  maintenance: ["Perawatan", "Maintenance"],
  retired: ["Pensiun", "Retired"],
  assetCountLabel: ["{count} aset", "{count} assets"],

  // ---------- Label status ----------
  statusGood: ["Baik", "Good"],
  statusDamaged: ["Rusak", "Damaged"],
  statusMaintenance: ["Dalam Perbaikan", "Under Repair"],
  statusRetired: ["Dihapuskan", "Retired"],
  ticketOpen: ["Open", "Open"],
  ticketOnHold: ["On Hold", "On Hold"],
  ticketInProgress: ["Diproses", "In Progress"],
  ticketResolved: ["Selesai", "Resolved"],
  priorityLow: ["Rendah", "Low"],
  priorityMedium: ["Sedang", "Medium"],
  priorityHigh: ["Tinggi", "High"],
  priorityUrgent: ["Mendesak", "Urgent"],

  // ---------- Dasbor ----------
  dashboard: ["Dasbor", "Dashboard"],
  dashboardSub: [
    "Ringkasan aset & peminjaman — glass modern, responsif",
    "Asset & lending overview — modern glass, responsive",
  ],
  todayIs: ["Hari ini {date}", "Today {date}"],
  newAsset: ["Aset Baru", "New Asset"],
  allAssetsTracked: ["Semua aset terdata", "All assets tracked"],
  percentOfTotal: ["% dari total", "% of total"],
  needAttention: ["Perlu Perhatian", "Needs Attention"],
  needsCheck: ["Perlu pengecekan", "Needs a check"],
  needsRepair: ["Perlu diperbaiki", "Needs repair"],
  noDamagedAssets: ["Tidak ada yang rusak", "Nothing damaged"],
  allAssetsGood: [
    "Semua aset kondisi baik 🎉",
    "All assets in good condition 🎉",
  ],
  needsCompleting: ["Perlu Dilengkapi", "Needs Completing"],
  needsCompletingSub: [
    "Aset yang stikernya sudah bisa dipindai tapi datanya masih kosong.",
    "Assets whose sticker already scans but whose data is still empty.",
  ],
  allAssetsComplete: [
    "Semua aset sudah lengkap datanya 🎉",
    "Every asset has complete data 🎉",
  ],
  missingFields: ["belum: {fields}", "missing: {fields}"],

  // ---------- Login ----------
  welcome: ["Selamat Datang", "Welcome"],
  loginToPinjamin: ["Masuk ke SIGAP", "Sign in to SIGAP"],
  username: ["Username", "Username"],
  password: ["Password", "Password"],
  loginAdmin: ["Masuk Admin", "Admin Login"],
  rememberMe: ["Ingat saya", "Remember me"],

  // ---------- Kategori ----------
  categoriesSub: [
    "Kelola kategori aset (satu kategori per aset)",
    "Manage asset categories (one category per asset)",
  ],
  addCategoryTitle: ["Tambah Kategori", "Add Category"],
  editCategoryTitle: ["Edit Kategori", "Edit Category"],
  confirmAddCategory: [
    'Tambah kategori "{name}"?',
    'Add the category "{name}"?',
  ],
  confirmEditCategory: [
    'Simpan perubahan kategori "{name}"?',
    'Save changes to the category "{name}"?',
  ],
  confirmDeleteCategory: ["Hapus kategori?", "Delete category?"],
  confirmDeleteCategoryBody: [
    'Kategori "{name}" akan dihapus permanen. Aset berkategori ini tidak ikut terhapus.',
    'The category "{name}" will be permanently deleted. Assets in it are not deleted.',
  ],

  // ---------- Tag ----------
  tagsSub: [
    "Label fleksibel lintas kategori (many-to-many) • atur warna tiap tag",
    "Flexible cross-category labels (many-to-many) • pick a color per tag",
  ],
  newTagPlaceholder: ["Nama tag baru...", "New tag name..."],
  pickColor: ["Pilih warna {color}", "Pick color {color}"],
  customColor: ["Warna custom", "Custom color"],
  previewTag: ["Preview tag", "Tag preview"],
  changeTagColor: ["Ubah warna tag", "Change tag color"],
  confirmAddTag: ['Tambah tag "{name}"?', 'Add the tag "{name}"?'],
  confirmDeleteTag: ["Hapus tag?", "Delete tag?"],
  confirmDeleteTagBody: [
    'Tag "{name}" akan dihapus permanen dari {count} aset terkait.',
    'The tag "{name}" will be permanently removed from {count} related assets.',
  ],

  // ---------- Peminjam ----------
  email: ["Email", "Email"],

  // ---------- Unggah foto ----------
  assetPhoto: ["Foto Aset", "Asset Photo"],
  photoSaved: ["Foto tersimpan", "Photo saved"],
  replacePhoto: ["Ganti foto", "Replace photo"],
  uploading: ["Mengupload...", "Uploading..."],
  deletePhoto: ["Hapus foto", "Delete photo"],
  pickAssetPhoto: ["Pilih foto aset", "Choose an asset photo"],
  dropFileHere: ["Lepas file di sini", "Drop the file here"],
  clickOrDrag: ["Klik kotak atau drag & drop", "Click the box or drag & drop"],
  photoHint: [
    "Foto tampil di kolom paling kiri daftar aset.",
    "The photo appears in the leftmost column of the asset list.",
  ],
  pickFile: ["Pilih File", "Choose File"],
  externalUrl: ["URL eksternal", "External URL"],
  urlModeHint: [
    "Tempel URL gambar eksternal (https://) atau gunakan mode Upload untuk file lokal.",
    "Paste an external image URL (https://) or switch to Upload for a local file.",
  ],
  onlyImageFiles: [
    "Hanya file gambar yang diizinkan (jpg, png, webp).",
    "Only image files are allowed (jpg, png, webp).",
  ],
  maxFileSize: [
    "Maksimal 5MB. Kompres dulu ya.",
    "5MB maximum. Please compress it first.",
  ],
  uploadFailed: ["Gagal upload", "Upload failed"],
  offlineStorageNote: [
    "Mode offline: foto dikompres & disimpan sebagai base64. Untuk production, aktifkan Supabase Storage (NEXT_PUBLIC_SUPABASE_URL + bucket assets).",
    "Offline mode: photos are compressed and stored as base64. For production, enable Supabase Storage (NEXT_PUBLIC_SUPABASE_URL + the assets bucket).",
  ],

  // ---------- Tiket (admin helpdesk) ----------
  ticketsSub: [
    "Terima, lacak, dan selesaikan permintaan bantuan dari landing page — user tidak perlu login.",
    "Receive, track, and resolve help requests from the landing page — users don't need to log in.",
  ],
  reload: ["Muat Ulang", "Reload"],
  loadDemoData: ["Muat data demo", "Load demo data"],
  confirmLoadDemoTickets: ["Muat tiket contoh?", "Load sample tickets?"],
  confirmLoadDemoTicketsBody: [
    "Daftar tiket saat ini akan diganti 18 tiket dummy Garudafood (IT, pabrik, fasilitas). Beberapa tertaut ke aset demo.",
    "The current ticket list will be replaced with 18 Garudafood sample tickets (IT, plant, facilities). Some are linked to demo assets.",
  ],
  yesLoadDemo: ["Ya, muat demo", "Yes, load demo"],
  demoTicketsLoaded: [
    "{count} tiket contoh dimuat.",
    "{count} sample tickets loaded.",
  ],
  demoTicketsFailed: [
    "Gagal memuat tiket demo.",
    "Failed to load demo tickets.",
  ],
  filterByStatus: ["Filter status {status}", "Filter by status {status}"],
  searchTickets: [
    "Cari nomor / nama / subjek...",
    "Search number / name / subject...",
  ],
  loadingTickets: ["Memuat tiket...", "Loading tickets..."],
  noTicketsYet: ["Belum ada tiket", "No tickets yet"],
  noTicketsHintAll: [
    "Tiket dari landing page akan muncul di sini, atau muat data contoh Garudafood.",
    "Tickets from the landing page show up here, or load the Garudafood sample data.",
  ],
  noTicketsHintFiltered: [
    "Tidak ada tiket berstatus {status}.",
    "No tickets with status {status}.",
  ],
  copyTicketNumber: ["Salin nomor tiket", "Copy ticket number"],
  createdAt: ["dibuat {date}", "created {date}"],
  updatedAt: ["update {date}", "updated {date}"],
  // Tidak lagi dipakai sejak penautan aset dihapus dari panel tiket, tapi
  // SENGAJA dipertahankan: CLAUDE.md melarang mengutak-atik nama kunci ini.
  changeStatus: ["Ubah Status", "Change Status"],
  deleteTicket: ["Hapus Tiket", "Delete Ticket"],
  confirmDeleteTicketBody: [
    "Hapus tiket {number} ({subject})? Tindakan ini tidak bisa dibatalkan.",
    "Delete ticket {number} ({subject})? This cannot be undone.",
  ],
  ticketDeleted: ["Tiket dihapus ✓", "Ticket deleted ✓"],
  ticketDeleteFailed: [
    "Gagal menghapus tiket.",
    "Failed to delete the ticket.",
  ],
  ticketSaveFailed: ["Gagal menyimpan tiket.", "Failed to save the ticket."],

  // ---------- Tiket: percakapan, SLA, prioritas ----------
  conversation: ["Percakapan", "Conversation"],
  loadingConversation: ["Memuat percakapan...", "Loading conversation..."],
  noMessagesYet: [
    "Belum ada balasan. Tulis pesan pertama untuk pelapor.",
    "No replies yet. Write the first message to the reporter.",
  ],
  adminLabel: ["Admin SIGAP", "SIGAP Admin"],
  replyPlaceholder: [
    "Tulis balasan yang akan dibaca pelapor...",
    "Write a reply the reporter will read...",
  ],
  sendReply: ["Kirim Balasan", "Send Reply"],
  replySent: ["Balasan terkirim ✓", "Reply sent ✓"],
  messageFailed: ["Gagal mengirim pesan.", "Failed to send the message."],
  replyVisibleHint: [
    "Balasan ini tampil di portal pelapor dan mengubah status tiket menjadi Dibalas.",
    "This reply appears in the reporter's portal and moves the ticket to Replied.",
  ],
  attachmentsLabel: ["Lampiran", "Attachments"],
  addAttachment: ["Tambah lampiran", "Add attachment"],
  uploadingAttachment: ["Mengunggah...", "Uploading..."],
  attachmentFailed: ["Gagal mengunggah lampiran.", "Attachment upload failed."],
  attachmentLimit: [
    "Maksimal {count} lampiran per pesan.",
    "Up to {count} attachments per message.",
  ],
  removeAttachment: ["Hapus lampiran", "Remove attachment"],
  changePriority: ["Prioritas", "Priority"],
  prioritySaved: ["Prioritas diperbarui ✓", "Priority updated ✓"],
  priorityHint: [
    "Prioritas dipakai tim untuk mengurutkan pekerjaan. Pelapor tidak memilihnya dan tidak melihatnya berubah.",
    "Priority is how the team orders its work. Reporters neither set it nor see it change.",
  ],

  // ---------- Daftar aset ----------
  assetsCountSummary: [
    "{filtered} aset • {total} total",
    "{filtered} assets • {total} total",
  ],
  importShort: ["Impor", "Import"],
  importExcel: ["Impor Excel", "Import Excel"],
  exportLabel: ["Ekspor", "Export"],
  newShort: ["Baru", "New"],
  closeNotification: ["Tutup notifikasi", "Close notification"],
  searchAssets: ["Cari aset, QR, serial...", "Search assets, QR, serial..."],
  allStatus: ["Semua Status", "All Status"],
  allCategories: ["Semua Kategori", "All Categories"],
  allLocations: ["Semua Lokasi", "All Locations"],
  allTags: ["Semua Tag", "All Tags"],
  sortDateCreated: ["Tanggal dibuat", "Date created"],
  sortNameAz: ["Nama A-Z", "Name A-Z"],
  sortValue: ["Nilai", "Value"],
  listView: ["Tampilan daftar", "List view"],
  gridView: ["Tampilan kartu", "Grid view"],
  listLabel: ["Daftar", "List"],
  gridLabel: ["Kartu", "Grid"],
  filter: ["Filter", "Filter"],
  filtersActive: ["{count} aktif", "{count} active"],
  clearFilters: ["Hapus filter", "Clear filters"],
  tagLabel: ["Tag", "Tag"],
  perPage: ["Per halaman", "Per page"],
  perPageOption: ["{count} / halaman", "{count} / page"],
  noAssetsYet: ["Belum ada aset", "No assets yet"],
  noAssetsHint: [
    "Buat manual, impor Excel apa adanya, atau muat data contoh Garudafood.",
    "Create one manually, import an Excel file as-is, or load the Garudafood sample data.",
  ],
  createFirstAsset: ["Buat aset pertama", "Create the first asset"],
  demoDataLoaded: [
    "Data contoh Garudafood dimuat (aset, lokasi pabrik, peminjaman, audit).",
    "Garudafood sample data loaded (assets, plant locations, bookings, audits).",
  ],
  photo: ["Foto", "Photo"],
  viewItem: ["Lihat {name}", "View {name}"],
  editItem: ["Edit {name}", "Edit {name}"],
  paginationInfo: [
    "Hal {page} dari {total} • {count} hasil",
    "Page {page} of {total} • {count} results",
  ],
  prev: ["Sebelumnya", "Prev"],
  next: ["Berikutnya", "Next"],
  confirmDeleteAsset: ["Hapus aset?", "Delete asset?"],
  confirmDeleteAssetBody: [
    '"{name}" ({qr}) akan dihapus permanen dan tidak bisa dikembalikan.',
    '"{name}" ({qr}) will be permanently deleted and cannot be restored.',
  ],
  exportEmpty: [
    "Tidak ada aset untuk diekspor — filter saat ini kosong.",
    "Nothing to export — the current filter matches no assets.",
  ],
  exportDone: [
    "{count} aset diekspor ke Excel (.xlsx).",
    "{count} assets exported to Excel (.xlsx).",
  ],
  importDone: [
    "{count} aset diimpor dari spreadsheet.",
    "{count} assets imported from the spreadsheet.",
  ],
  importNone: [
    "Tidak ada baris yang masuk (mungkin semua duplikat).",
    "No rows were imported (they may all be duplicates).",
  ],
  colName: ["Nama", "Name"],
  colStatus: ["Status", "Status"],
  colCategory: ["Kategori", "Category"],
  colLocation: ["Lokasi", "Location"],
  colQr: ["Kode QR", "QR Code"],
  colValue: ["Nilai", "Value"],
  colSerial: ["Nomor Seri", "Serial Number"],
  colDescription: ["Deskripsi", "Description"],
  colTags: ["Tag", "Tags"],
  sheetAssets: ["Aset", "Assets"],

  // ---------- Form aset ----------
  addAssetTitle: ["Tambah Aset", "Add Asset"],
  addAssetSub: [
    "Isi detail aset baru. QR & Serial akan dibuat otomatis.",
    "Fill in the new asset's details. QR and serial are generated automatically.",
  ],
  assetInfo: ["Informasi Aset", "Asset Information"],
  assetName: ["Nama Aset", "Asset Name"],
  descriptionPlaceholder: ["Deskripsi aset...", "Asset description..."],
  ownerLabel: ["Pemilik", "Owner"],
  ownerPlaceholder: ["Nama pemegang aset", "Asset holder name"],
  specLabel: ["Spesifikasi", "Specification"],
  specPlaceholder: [
    "Core i5-1135G7, RAM 8GB, SSD 512GB",
    "Core i5-1135G7, 8GB RAM, 512GB SSD",
  ],
  specHint: [
    "Bebas diisi. Untuk aset non-komputer bisa diisi kapasitas atau daya.",
    "Free text. For non-computer assets, use capacity or power rating.",
  ],
  serialAuto: ["Serial Number (Otomatis)", "Serial Number (Automatic)"],
  serialWillBe: [
    "— akan jadi {serial} untuk aset ini",
    "— will be {serial} for this asset",
  ],
  serialAutoHint: [
    "Nomor urut otomatis mulai 001, tidak perlu isi manual.",
    "Auto-numbered from 001 — no need to type it in.",
  ],
  noTagsYet: [
    "Belum ada tag — buat di menu Tag",
    "No tags yet — create one from the Tags menu",
  ],
  tagsSelected: [
    "{count} tag dipilih • klik untuk pilih/hapus",
    "{count} tags selected • click to select/deselect",
  ],
  saveAsset: ["Simpan Aset", "Save Asset"],
  nameRequired: ["Nama wajib diisi", "Name is required"],
  confirmAddAsset: ['Tambah aset "{name}"?', 'Add the asset "{name}"?'],
  confirmAddAssetBody: [
    "Aset baru akan dibuat dengan serial {serial} dan QR otomatis.",
    "The new asset will be created with serial {serial} and an automatic QR code.",
  ],

  // ---------- Detail aset ----------
  assetNotFound: ["Aset tidak ditemukan.", "Asset not found."],
  backToAssets: ["Kembali ke Aset", "Back to Assets"],
  noDescription: ["Tanpa deskripsi", "No description"],
  createdLabel: ["Dibuat", "Created"],
  serialLabel: ["Serial", "Serial"],
  historyAndNotes: ["Riwayat & Catatan", "History & Notes"],
  noNotesYet: ["Belum ada catatan.", "No notes yet."],
  lastUpdate: ["Update terakhir: {date}", "Last updated: {date}"],
  scanForQuickAction: ["Scan untuk aksi cepat", "Scan for quick actions"],
  qrPngFailed: [
    "Gagal membuat PNG QR. Coba lagi.",
    "Failed to generate the QR PNG. Please try again.",
  ],
  qrPrintFailed: [
    "Gagal menyiapkan print QR. Coba lagi.",
    "Failed to prepare the QR for printing. Please try again.",
  ],
  generating: ["Membuat...", "Generating..."],
  download: ["Unduh", "Download"],
  preparing: ["Menyiapkan...", "Preparing..."],
  print: ["Cetak", "Print"],
  editAsset: ["Edit Aset", "Edit Asset"],

  // ---------- Edit aset ----------
  editAssetOf: ["Edit {name}", "Edit {name}"],
  confirmSaveChanges: [
    'Simpan perubahan "{name}"?',
    'Save changes to "{name}"?',
  ],
  confirmSaveAssetBody: [
    "Data aset akan diperbarui sesuai isian form.",
    "The asset will be updated with the values in this form.",
  ],
  serialAutoLocked: ["Otomatis, tidak diubah", "Automatic, not editable"],
  noTagsShort: ["Belum ada tag", "No tags yet"],

  // ---------- Lokasi ----------
  locationsSummary: [
    "{parents} lokasi parent • {regular} lokasi biasa",
    "{parents} parent locations • {regular} regular locations",
  ],
  editLocation: ["Edit Lokasi", "Edit Location"],
  locationType: ["Tipe Lokasi", "Location Type"],
  regularLocation: ["Lokasi Biasa", "Regular Location"],
  regularLocationHint: [
    "Ruangan/titik — bisa masuk parent",
    "A room or spot — can sit inside a parent",
  ],
  parentLocation: ["Lokasi Parent", "Parent Location"],
  parentLocationHint: [
    "Gedung/area — menaungi sub-lokasi",
    "A building or area — holds sub-locations",
  ],
  parentOf: ["Parent Lokasi", "Parent Location"],
  noParentStandalone: ["— Tidak ada (mandiri) —", "— None (standalone) —"],
  parentDropdownHint: [
    "Dropdown hanya menampilkan lokasi bertipe parent.",
    "The dropdown only lists locations of the parent type.",
  ],
  placePhoto: ["Foto Tempat", "Place Photo"],
  parentBadge: ["Parent", "Parent"],
  subCount: [" • {count} sub", " • {count} sub"],
  insideOf: ["Di dalam: {name} • ", "Inside: {name} • "],
  noLocationsYet: ["Belum ada lokasi", "No locations yet"],
  noLocationsHint: [
    "Buat lokasi pertama dengan foto",
    "Create your first location with a photo",
  ],
  addFirstLocation: ["Tambah Lokasi Pertama", "Add the First Location"],
  confirmEditLocation: [
    'Simpan perubahan lokasi "{name}"?',
    'Save changes to the location "{name}"?',
  ],
  confirmDeleteLocation: ["Hapus lokasi?", "Delete location?"],
  confirmDeleteLocationBody: [
    '"{name}" akan dihapus permanen. Aset di lokasi ini tidak ikut terhapus.',
    '"{name}" will be permanently deleted. Assets in this location are not deleted.',
  ],
  confirmDeleteLocationParentExtra: [
    " Sub-lokasi di dalamnya menjadi lokasi biasa.",
    " Its sub-locations become regular locations.",
  ],
  confirmAddLocation: ['Tambah lokasi "{name}"?', 'Add the location "{name}"?'],
  saveLocation: ["Simpan Lokasi", "Save Location"],

  // ---------- Tambah lokasi ----------
  backToLocations: ["Kembali ke Daftar Lokasi", "Back to Locations"],
  addLocationHeading: ["Tambah Lokasi Baru", "Add a New Location"],
  addLocationHeadingSub: [
    "Pilih tipe: lokasi parent (gedung/area) atau lokasi biasa (ruangan/titik yang bisa masuk parent).",
    "Pick a type: parent location (building/area) or regular location (a room or spot that can sit inside a parent).",
  ],
  newLocationForm: ["Form Lokasi Baru", "New Location Form"],
  confirmAddLocationParentBody: [
    "Akan terdaftar sebagai lokasi parent (bisa menaungi sub-lokasi).",
    "It will be registered as a parent location (it can hold sub-locations).",
  ],
  confirmAddLocationRegularBody: [
    "Lokasi baru akan tersedia untuk dipilih pada aset dan kit.",
    "The new location becomes selectable on assets and kits.",
  ],
  createNewParent: ["Buat Parent Baru", "Create New Parent"],
  confirmAddParentLocation: [
    'Tambah lokasi parent "{name}"?',
    'Add the parent location "{name}"?',
  ],
  noParentYet: [
    'Belum ada lokasi parent — buat lewat tombol "Buat Parent Baru" di atas, atau pilih tipe "Lokasi Parent".',
    'No parent locations yet — use the "Create New Parent" button above, or pick the "Parent Location" type.',
  ],
  newParentName: ["Nama Parent Baru", "New Parent Name"],
  createShort: ["Buat", "Create"],
  parentAutoSelected: [
    "Parent langsung terpilih di dropdown setelah dibuat.",
    "The parent is selected in the dropdown as soon as it is created.",
  ],
  parentDropdownHintLong: [
    "Dropdown hanya menampilkan lokasi bertipe parent. Pilih parent jika lokasi ini anak dari gedung/area lain.",
    "The dropdown only lists parent-type locations. Pick one if this location sits inside another building or area.",
  ],
  locationDescriptionPlaceholder: [
    "Deskripsi lokasi, kapasitas, fasilitas...",
    "Location description, capacity, facilities...",
  ],

  // ---------- Peminjaman ----------
  genericFailed: ["Gagal", "Failed"],

  // ---------- Laporan ----------
  reportsSub: [
    "Laporan & ekspor — SIGAP Garudafood",
    "Reports & exports — SIGAP Garudafood",
  ],
  reportInventoryTitle: ["Inventaris Aset", "Asset Inventory"],
  reportInventorySub: [
    "Jumlah per kategori/lokasi/status",
    "Counts by category / location / status",
  ],
  pdfReportTitle: ["Laporan Inventaris", "Inventory Report"],
  pdfTotalAssets: ["Total Aset: {count}", "Total assets: {count}"],
  pdfCategoryLine: ["{name}: {count} aset", "{name}: {count} assets"],
  pdfPrintedAt: [
    "Dicetak: {date} • SIGAP v1.1",
    "Printed: {date} • SIGAP v1.1",
  ],
  sheetReport: ["Laporan", "Report"],

  // ---------- Pengaturan akun ----------
  accountSettingsSub: [
    "Kelola identitas & keamanan akun administrator.",
    "Manage the administrator account's identity and security.",
  ],
  avatarHint: [
    "JPG / PNG / WEBP, maks 5MB — otomatis dikompres.",
    "JPG / PNG / WEBP, 5MB max — compressed automatically.",
  ],
  pickPhoto: ["Pilih Foto", "Choose Photo"],
  onlyImageFilesShort: [
    "Hanya file gambar (jpg, png, webp).",
    "Image files only (jpg, png, webp).",
  ],
  photoPickedReminder: [
    "Foto dipilih — jangan lupa klik Simpan Perubahan.",
    "Photo selected — remember to click Save Changes.",
  ],
  photoProcessFailed: [
    "Gagal memproses foto. Coba lagi.",
    "Could not process the photo. Please try again.",
  ],
  profileSaveFailed: ["Gagal menyimpan profil.", "Failed to save the profile."],
  profileSaveFailedRetry: [
    "Gagal menyimpan profil. Coba lagi.",
    "Failed to save the profile. Please try again.",
  ],
  profileSaved: ["Profil berhasil disimpan ✓", "Profile saved ✓"],
  usernameHint: [
    "3–32 karakter: huruf, angka, titik, strip, underscore. Dipakai saat login.",
    "3–32 characters: letters, digits, dots, hyphens, underscores. Used to sign in.",
  ],
  saveChanges: ["Simpan Perubahan", "Save Changes"],
  passwordSectionHint: [
    "Perbarui password di sini. Isi password saat ini untuk verifikasi, lalu masukkan password barunya.",
    "Update your password here. Enter the current one to verify, then the new one.",
  ],
  currentPassword: ["Password Saat Ini", "Current Password"],
  newPassword: ["Password Baru", "New Password"],
  confirmNewPassword: ["Konfirmasi Password Baru", "Confirm New Password"],
  passwordRulesHint: [
    "Minimal 8 karakter, harus berisi huruf dan angka. Sesi lain akan keluar; sesi ini tetap aktif.",
    "At least 8 characters, with letters and digits. Other sessions are signed out; this one stays active.",
  ],
  allPasswordFieldsRequired: [
    "Semua kolom password wajib diisi.",
    "All password fields are required.",
  ],
  passwordMismatch: [
    "Konfirmasi password baru tidak sama.",
    "The new password confirmation does not match.",
  ],
  passwordResetFailed: [
    "Gagal mereset password.",
    "Failed to reset the password.",
  ],
  passwordResetFailedRetry: [
    "Gagal mereset password. Coba lagi.",
    "Failed to reset the password. Please try again.",
  ],
  passwordResetOk: [
    "Password berhasil direset — pakai password baru di login berikutnya ✓",
    "Password reset — use the new one at your next sign-in ✓",
  ],
  processing: ["Memproses...", "Processing..."],
  resetPassword: ["Reset Password", "Reset Password"],
  demoDataSection: ["Data contoh Garudafood", "Garudafood Sample Data"],
  demoDataSectionHint: [
    "Muat ulang dataset demo: 28 aset, pabrik Pati/Rembang, DC Cikarang, peminjaman, kit, dan audit. Data aset yang ada akan ditimpa.",
    "Reload the demo dataset: 28 assets, the Pati/Rembang plants, the Cikarang DC, bookings, kits, and audits. Existing asset data is overwritten.",
  ],
  currentAssetCount: [
    "Saat ini ada {count} aset di sistem.",
    "There are currently {count} assets in the system.",
  ],
  supabaseSeedNote: [
    "Database Supabase aktif — data contoh dimuat lewat SQL (supabase/03-seed.sql), bukan dari tombol ini.",
    "Supabase is active — sample data is loaded through SQL (supabase/03-seed.sql), not from this button.",
  ],
  confirmLoadDemoAssets: ["Muat data aset contoh?", "Load sample asset data?"],
  confirmLoadDemoAssetsBody: [
    "Seluruh aset, booking, dan master data saat ini akan diganti dengan data dummy Garudafood.",
    "All current assets, bookings, and master data will be replaced with Garudafood sample data.",
  ],
  yesLoadDemoAssets: ["Ya, muat demo aset", "Yes, load demo assets"],
  demoAssetsLoaded: [
    "Data aset contoh Garudafood berhasil dimuat.",
    "Garudafood sample asset data loaded.",
  ],
  demoAssetsBtn: ["Demo aset", "Demo assets"],
  confirmLoadDemoTicketsShortBody: [
    "Daftar tiket helpdesk akan diganti 18 tiket dummy (IT, pabrik, fasilitas).",
    "The helpdesk ticket list will be replaced with 18 sample tickets (IT, plant, facilities).",
  ],
  yesLoadDemoTickets: ["Ya, muat demo tiket", "Yes, load demo tickets"],
  demoTicketsLoadedSettings: [
    "{count} tiket contoh Garudafood dimuat.",
    "{count} Garudafood sample tickets loaded.",
  ],
  serverUnreachable: [
    "Tidak bisa terhubung ke server.",
    "Could not reach the server.",
  ],
  demoTicketsBtn: ["Demo tiket", "Demo tickets"],

  // ---------- Pesan error dari server (dipetakan lewat `code`) ----------
  errTooManyAttempts: [
    "Terlalu banyak percobaan. Coba lagi dalam {retryAfter} detik.",
    "Too many attempts. Try again in {retryAfter} seconds.",
  ],
  errInvalidBody: [
    "Data yang dikirim tidak valid.",
    "The submitted data is invalid.",
  ],
  errAdminNotConfigured: [
    "Akun admin belum dikonfigurasi di server. Hubungi administrator.",
    "No admin account is configured on the server. Contact an administrator.",
  ],
  errBadCredentials: [
    "Username atau password salah.",
    "Incorrect username or password.",
  ],
  errServerMisconfigured: [
    "Konfigurasi server belum lengkap (AUTH_SECRET). Hubungi administrator.",
    "The server is not fully configured (AUTH_SECRET). Contact an administrator.",
  ],
  errWrongCurrentPassword: [
    "Password saat ini salah.",
    "The current password is incorrect.",
  ],
  errSamePassword: [
    "Password baru tidak boleh sama dengan password lama.",
    "The new password must differ from the old one.",
  ],
  loginFailed: ["Login gagal", "Sign-in failed"],
  serverUnreachableRetry: [
    "Tidak bisa terhubung ke server. Coba lagi.",
    "Could not reach the server. Please try again.",
  ],
  backToHome: ["Kembali ke Beranda", "Back to Home"],
  hidePassword: ["Sembunyikan password", "Hide password"],
  showPassword: ["Lihat password", "Show password"],
  rememberDurationLong: ["7 hari", "7 days"],
  rememberDurationShort: ["12 jam", "12 hours"],

  // ---------- Dialog impor ----------
  importTitle: ["Impor dari Excel / CSV", "Import from Excel / CSV"],
  importSubtitle: [
    "Tidak perlu template — kolom dideteksi otomatis, bisa Anda sesuaikan.",
    "No template needed — columns are detected automatically and you can adjust them.",
  ],
  readingFile: ["Membaca file…", "Reading file…"],
  dropOrPickFile: ["Jatuhkan atau pilih file", "Drop a file or choose one"],
  importFileHint: [
    ".xlsx · .xls · .csv · .ods — header bebas (Nama / Barang / Asset, Lokasi, Kategori, …)",
    ".xlsx · .xls · .csv · .ods — any headers (Name / Item / Asset, Location, Category, …)",
  ],
  importReadFailed: ["Gagal membaca file.", "Could not read the file."],
  sheetLabel: ["Sheet: {name}", "Sheet: {name}"],
  rowsReady: ["{count} baris siap impor", "{count} rows ready to import"],
  rowsSkippedNoName: [
    " · {count} tanpa nama dilewati",
    " · {count} without a name skipped",
  ],
  changeFile: ["Ganti file", "Change file"],
  nameNotMapped: [
    "Kolom Nama aset belum terpetakan. Pilih kolom yang berisi nama barang di bawah.",
    "The Asset name column is not mapped yet. Pick the column holding item names below.",
  ],
  columnMapping: ["Pemetaan kolom", "Column mapping"],
  columnN: ["Kolom {n}", "Column {n}"],
  previewCount: [
    "Pratinjau ({shown} dari {total})",
    "Preview ({shown} of {total})",
  ],
  colPic: ["PIC", "PIC"],
  importNRows: ["Impor {count} baris", "Import {count} rows"],
  importedSummary: ["{count} aset masuk", "{count} assets imported"],
  createdCategories: ["{count} kategori baru", "{count} new categories"],
  createdLocations: ["{count} lokasi baru", "{count} new locations"],
  createdTags: ["{count} tag baru", "{count} new tags"],
  skippedRows: [
    " {count} baris dilewati (duplikat QR / nama kosong).",
    " {count} rows skipped (duplicate QR / empty name).",
  ],
  // Label field pemetaan impor
  importFieldName: ["Nama aset", "Asset name"],
  importFieldStatus: ["Status", "Status"],
  importFieldCategory: ["Kategori", "Category"],
  importFieldLocation: ["Lokasi", "Location"],
  importFieldQr: ["Kode QR / kode aset", "QR code / asset code"],
  importFieldValue: ["Nilai / harga", "Value / price"],
  importFieldSerial: ["Nomor seri", "Serial number"],
  importFieldDescription: ["Deskripsi / keterangan", "Description / notes"],
  importFieldCustodian: ["Peminjam / PIC", "Custodian / PIC"],
  importFieldTags: ["Tag", "Tags"],
  importFieldSkip: ["Abaikan kolom ini", "Ignore this column"],

  // ---------- Lain-lain ----------
  assetPhotoAlt: ["Foto aset", "Asset photo"],
} as const satisfies Record<string, readonly [string, string]>;

export type MessageKey = keyof typeof messages;
