/**
 * PANEL ADMIN — Website Sekolah
 * Guru log masuk dengan satu kata laluan, kemudian boleh
 * mengemaskini maklumat mengikut menu.
 */
(function () {
  'use strict';

  const API = CONFIG.API_URL;
  const KUNCI_TOKEN = 'tokenAdmin';
  const CACHE = {};
  let TOKEN = null;
  let namaSekolah = '';
  let logoSekolah = '';
  let pemasaToast = null;

  try { TOKEN = sessionStorage.getItem(KUNCI_TOKEN); } catch (e) { /* abaikan */ }


  /* ================= KONFIGURASI MENU & BORANG ================= */

  function medanKandungan(kategori) {
    return [
      { n: 'Tajuk', l: 'Tajuk', wajib: true },
      { n: 'Kategori', l: 'Kategori', jenis: 'kategori', pilihan: kategori, bantu: 'Pilih daripada senarai atau taip kategori baharu.' },
      { n: 'Tarikh', l: 'Tarikh', jenis: 'date' },
      { n: 'Kandungan', l: 'Kandungan', jenis: 'textarea', wajib: true, baris: 8, bantu: 'Tekan Enter dua kali untuk memulakan perenggan baharu.' },
      { n: 'Gambar', l: 'Gambar', jenis: 'gambar', bantu: 'Boleh pilih beberapa gambar sekaligus.' },
      { n: 'Video', l: 'Pautan video YouTube (pilihan)', jenis: 'url', bantu: 'Contoh: https://youtu.be/abc123xyz' }
    ];
  }

  const MENU_AWAM = [
    { v: 'utama', l: 'Utama' }, { v: 'pentadbiran', l: 'Pentadbiran' }, { v: 'kurikulum', l: 'Kurikulum' },
    { v: 'hem', l: 'HEM' }, { v: 'kokurikulum', l: 'Kokurikulum' }, { v: 'aktiviti', l: 'Aktiviti' },
    { v: 'pautan', l: 'Pautan' }, { v: 'aduan', l: 'Aduan' }
  ];
  const JENIS_SUBMENU = [
    { v: 'teks', l: 'Halaman teks dan gambar' },
    { v: 'embed', l: 'Benam kod HTML atau pautan (embed)' },
    { v: 'pautan', l: 'Pautan ke laman lain' }
  ];
  function labelDari(senarai, v) {
    const x = senarai.filter(function (p) { return p.v === v; })[0];
    return x ? x.l : v;
  }

  const KONFIG = {
    pengumuman: {
      tab: 'Pengumuman', namaItem: 'pengumuman', lajurTajuk: 'Tajuk',
      medan: [
        { n: 'Tajuk', l: 'Tajuk pengumuman', wajib: true },
        { n: 'Tarikh', l: 'Tarikh', jenis: 'date' },
        { n: 'Status', l: 'Status', jenis: 'select', pilihan: ['Terbit', 'Draf'], bantu: 'Pengumuman berstatus Draf tidak dipaparkan kepada orang awam.' },
        { n: 'Kandungan', l: 'Kandungan', jenis: 'textarea', wajib: true },
        { n: 'Gambar', l: 'Gambar (pilihan)', jenis: 'gambar' },
        { n: 'Sumber', l: 'Pautan sumber (pilihan)', jenis: 'url', bantu: 'Pautan ke berita atau pekeliling asal, jika ada.' }
      ]
    },
    pentadbiran: {
      tab: 'Pentadbiran', namaItem: 'pentadbir', lajurTajuk: 'Nama', susun: true,
      medan: [
        { n: 'Nama', l: 'Nama penuh', wajib: true },
        { n: 'Jawatan', l: 'Jawatan', wajib: true, jenis: 'kategori',
          pilihan: ['Guru Besar', 'Penolong Kanan Pentadbiran', 'Penolong Kanan Hal Ehwal Murid', 'Penolong Kanan Kokurikulum', 'Penolong Kanan Pendidikan Khas', 'Penyelia Petang'] },
        { n: 'Susunan', l: 'Susunan paparan', jenis: 'number', bantu: '1 untuk Guru Besar, 2 untuk Penolong Kanan pertama, dan seterusnya.' },
        { n: 'Gambar', l: 'Gambar', jenis: 'gambar', satu: true }
      ]
    },
    kurikulum: { tab: 'Kurikulum', namaItem: 'maklumat', lajurTajuk: 'Tajuk',
      medan: medanKandungan(['Peperiksaan', 'Pencapaian', 'Program akademik', 'Panitia', 'Makluman']) },
    hem: { tab: 'HEM', namaItem: 'maklumat', lajurTajuk: 'Tajuk',
      medan: medanKandungan(['Disiplin', 'Kebajikan', 'Kesihatan', 'Bimbingan dan kaunseling', 'Makluman']) },
    kokurikulum: { tab: 'Kokurikulum', namaItem: 'maklumat', lajurTajuk: 'Tajuk',
      medan: medanKandungan(['Kelab dan persatuan', 'Unit beruniform', 'Sukan dan permainan', 'Pertandingan', 'Makluman']) },
    aktiviti: { tab: 'Aktiviti', namaItem: 'aktiviti', lajurTajuk: 'Tajuk',
      medan: medanKandungan(['Majlis rasmi', 'Sambutan', 'Sukan', 'Akademik', 'Lawatan', 'Program komuniti']) },
    submenu: {
      tab: 'Submenu', namaItem: 'submenu', lajurTajuk: 'Tajuk', susun: true,
      borang: function (b, k, i) { lukisBorangSubmenu(b, k, i); },
      urut: function (a, b) {
        const ia = MENU_AWAM.map(function (m) { return m.v; }).indexOf(a.Menu);
        const ib = MENU_AWAM.map(function (m) { return m.v; }).indexOf(b.Menu);
        return (ia - ib) || ((Number(a.Susunan) || 999) - (Number(b.Susunan) || 999));
      },
      medan: []
    },
    pautan: {
      tab: 'Pautan', namaItem: 'pautan', lajurTajuk: 'Nama', susun: true,
      medan: [
        { n: 'Nama', l: 'Nama laman', wajib: true },
        { n: 'URL', l: 'Alamat laman web', jenis: 'url', wajib: true, bantu: 'Contoh: https://www.moe.gov.my' },
        { n: 'Kategori', l: 'Kategori', jenis: 'kategori', pilihan: ['Kementerian dan jabatan', 'Sistem pendidikan', 'Portal kerajaan', 'Pautan lain'],
          bantu: 'Pautan dikumpulkan mengikut kategori di website.' },
        { n: 'Keterangan', l: 'Keterangan ringkas (pilihan)', jenis: 'textarea', baris: 2 },
        { n: 'Susunan', l: 'Susunan paparan', jenis: 'number', bantu: 'Nombor kecil dipaparkan dahulu.' },
        { n: 'Logo', l: 'Logo (pilihan)', jenis: 'gambar', satu: true, png: true,
          bantu: 'Jika dibiarkan kosong, ikon laman web akan digunakan secara automatik.' }
      ]
    }
  };

  const MEDAN_TETAPAN = [
    { legend: 'Identiti sekolah', medan: [
      { n: 'nama_sekolah', l: 'Nama sekolah', wajib: true },
      { n: 'moto', l: 'Moto' },
      { n: 'logo', l: 'Logo sekolah', jenis: 'gambar', satu: true, png: true, bantu: 'Gunakan fail PNG berlatar telus jika ada.' },
      { n: 'banner', l: 'Gambar banner laman utama', jenis: 'gambar', satu: true, bantu: 'Gambar mendatar (landskap), contohnya bangunan sekolah.' }
    ]},
    { legend: 'Guru Besar', medan: [
      { n: 'nama_guru_besar', l: 'Nama Guru Besar' },
      { n: 'gambar_guru_besar', l: 'Gambar Guru Besar', jenis: 'gambar', satu: true },
      { n: 'kata_aluan', l: 'Kata alu-aluan', jenis: 'textarea', baris: 8 }
    ]},
    { legend: 'Visi dan misi', medan: [
      { n: 'visi', l: 'Visi', jenis: 'textarea', baris: 3 },
      { n: 'misi', l: 'Misi', jenis: 'textarea', baris: 5, bantu: 'Tulis setiap misi pada baris baharu.' }
    ]},
    { legend: 'Maklumat perhubungan', medan: [
      { n: 'alamat', l: 'Alamat', jenis: 'textarea', baris: 3 },
      { n: 'telefon', l: 'No. telefon' },
      { n: 'emel', l: 'Emel', jenis: 'email' },
      { n: 'facebook', l: 'Pautan Facebook', jenis: 'url' },
      { n: 'peta_google', l: 'Peta Google Maps', jenis: 'textarea', baris: 3,
        bantu: 'Di Google Maps, cari sekolah, klik Kongsi (Share), pilih Benamkan peta (Embed a map), klik Salin HTML, kemudian tampal di sini.' }
    ]}
  ];

  const MENU_ADMIN = [
    { id: 'homepage', label: 'Homepage', lencana: 'lencanaAI' },
    { id: 'pentadbiran', label: 'Pentadbiran' },
    { id: 'kurikulum', label: 'Kurikulum' },
    { id: 'hem', label: 'HEM' },
    { id: 'kokurikulum', label: 'Kokurikulum' },
    { id: 'aktiviti', label: 'Aktiviti sekolah' },
    { id: 'pautan', label: 'Pautan' },
    { id: 'submenu', label: 'Submenu & halaman' },
    { id: 'aduan', label: 'Aduan' },
    { id: 'ai', label: 'Pembantu AI' },
    { pemisah: true },
    { id: 'kataLaluan', label: 'Tukar kata laluan' }
  ];

  const TAJUK_SEKSYEN = {
    homepage: ['Homepage', 'Maklumat sekolah di laman utama dan pengumuman.'],
    pentadbiran: ['Pentadbiran', 'Senarai pentadbir yang dipaparkan di halaman Pentadbiran.'],
    kurikulum: ['Kurikulum', 'Maklumat akademik, peperiksaan dan pencapaian murid.'],
    hem: ['Hal Ehwal Murid', 'Maklumat disiplin, kebajikan, kesihatan dan bimbingan murid.'],
    kokurikulum: ['Kokurikulum', 'Maklumat kelab, persatuan, unit beruniform dan sukan.'],
    aktiviti: ['Aktiviti sekolah', 'Kongsi gambar dan video program sekolah.'],
    pautan: ['Pautan', 'Pautan ke laman web rasmi kerajaan dan sistem pendidikan.'],
    submenu: ['Submenu & halaman', 'Tambah submenu di bawah mana-mana menu utama: halaman teks, sistem yang dibenamkan (embed HTML) atau pautan ke laman lain.'],
    aduan: ['Aduan', 'Aduan dan maklum balas yang dihantar oleh orang awam.'],
    ai: ['Pembantu AI', 'AI mencari berita penting setiap hari dan mencadangkannya sebagai draf pengumuman.'],
    kataLaluan: ['Tukar kata laluan', 'Kata laluan ini dikongsi oleh semua guru. Maklumkan kepada guru lain selepas menukarnya.']
  };


  /* ================= FUNGSI BANTUAN ================= */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inisial(n) {
    return String(n || '').split(/\s+/).filter(Boolean).slice(0, 3).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  function ringkas(s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n).trim() + '…' : s;
  }
  function urlGambar(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/drive\.google|docs\.google/.test(u)) {
      const m = u.match(/\/d\/([\w-]{20,})/) || u.match(/[?&]id=([\w-]{20,})/);
      if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
    }
    return /^https:\/\//.test(u) ? u : '';
  }
  function saiz(u, w) {
    if (!u) return '';
    return /^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(u) ? u + '=w' + w : u;
  }
  function formatTarikh(t) {
    if (!t) return '';
    const d = new Date(String(t).slice(0, 10) + 'T00:00:00');
    if (isNaN(d)) return esc(t);
    return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function hariIni() { return new Date().toLocaleDateString('en-CA'); } // yyyy-mm-dd

  function skrin() { return document.getElementById('skrin'); }
  function memuatKecil() { return '<div class="memuat-kecil" role="status"><span class="pusing"></span>Memuatkan…</div>'; }
  function ralatMuat(m) { return '<div class="kosong"><p>' + esc(m) + '</p></div>'; }

  function toast(teks, jenis) {
    const el = document.getElementById('toast');
    if (!el) return;
    const ralat = jenis === 'ralat';
    el.textContent = teks;
    el.className = 'toast papar' + (ralat ? ' ralat' : '');
    clearTimeout(pemasaToast);
    pemasaToast = setTimeout(function () { el.className = 'toast' + (ralat ? ' ralat' : ''); }, ralat ? 6000 : 3500);
  }

  function isiLambang() {
    document.querySelectorAll('[data-lambang]').forEach(function (el) {
      const logo = urlGambar(logoSekolah);
      if (logo) el.innerHTML = '<img src="' + esc(logo) + '" alt="">';
      else el.textContent = inisial(namaSekolah) || 'A';
    });
    document.querySelectorAll('[data-nama-sekolah]').forEach(function (el) {
      el.textContent = namaSekolah || 'Ruangan kemaskini laman web sekolah';
    });
  }


  /* ================= SAMBUNGAN KE APPS SCRIPT ================= */

  async function panggil(action, tambahan) {
    let j;
    try {
      const r = await fetch(API, {
        method: 'POST',
        body: JSON.stringify(Object.assign({ action: action, token: TOKEN }, tambahan || {}))
      });
      j = await r.json();
    } catch (e) {
      throw new Error('Tiada sambungan ke pelayan. Semak internet anda dan cuba lagi.');
    }
    if (!j.ok) {
      if (j.mesej === 'SESI_TAMAT') {
        tamatSesi();
        throw new Error('Sesi telah tamat. Sila log masuk semula.');
      }
      throw new Error(j.mesej || 'Ralat tidak diketahui.');
    }
    return j;
  }

  async function muatTab(tab, paksa) {
    if (!paksa && CACHE[tab]) return CACHE[tab];
    const j = await panggil('bacaAdmin', { tab: tab });
    CACHE[tab] = j.data;
    return j.data;
  }

  // Selepas simpan, buang data lama supaya website awam memaparkan maklumat terkini
  function batalCache(tab) {
    delete CACHE[tab];
    try { localStorage.removeItem('dataSekolah_v2'); } catch (e) { /* abaikan */ }
  }

  function tamatSesi() {
    TOKEN = null;
    try { sessionStorage.removeItem(KUNCI_TOKEN); } catch (e) { /* abaikan */ }
    lukisLogin('Sesi telah tamat. Sila log masuk semula.');
  }

  async function ambilNamaSekolah() {
    try {
      const c = JSON.parse(localStorage.getItem('dataSekolah_v2') || 'null');
      if (c && c.data && c.data.Tetapan) {
        namaSekolah = c.data.Tetapan.nama_sekolah || '';
        logoSekolah = c.data.Tetapan.logo || '';
        isiLambang();
        return;
      }
    } catch (e) { /* abaikan */ }
    try {
      const r = await fetch(API + '?action=tab&tab=Tetapan');
      const j = await r.json();
      if (j.ok) {
        namaSekolah = j.data.nama_sekolah || '';
        logoSekolah = j.data.logo || '';
        isiLambang();
      }
    } catch (e) { /* abaikan */ }
  }


  /* ================= LOG MASUK ================= */

  function lukisLogin(mesej, jenis) {
    document.title = 'Log masuk guru';
    skrin().innerHTML =
      '<div class="login-latar">' +
        '<form class="login-kotak" id="borangLogin" novalidate>' +
          '<span class="lambang" data-lambang aria-hidden="true"></span>' +
          '<h1>Log masuk guru</h1>' +
          '<p data-nama-sekolah></p>' +
          '<div class="medan"><label for="kataLaluan">Kata laluan</label>' +
            '<input type="password" id="kataLaluan" autocomplete="current-password" required></div>' +
          '<label class="tunjuk"><input type="checkbox" id="tunjukKL"> Tunjuk kata laluan</label>' +
          '<button class="butang butang-emas" type="submit">Log masuk</button>' +
          '<div class="mesej-borang' + (mesej ? ' ' + (jenis || 'ralat') : '') + '" id="mesejLogin" role="alert">' + esc(mesej || '') + '</div>' +
          '<a class="kembali" href="index.html">Kembali ke laman web</a>' +
        '</form>' +
      '</div>';
    isiLambang();

    const f = document.getElementById('borangLogin');
    const input = document.getElementById('kataLaluan');
    const m = document.getElementById('mesejLogin');
    input.focus();
    document.getElementById('tunjukKL').addEventListener('change', function (e) {
      input.type = e.target.checked ? 'text' : 'password';
    });

    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!input.value) {
        m.className = 'mesej-borang ralat';
        m.textContent = 'Sila masukkan kata laluan.';
        return;
      }
      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sedang log masuk…';
      try {
        const j = await panggil('login', { password: input.value });
        TOKEN = j.token;
        try { sessionStorage.setItem(KUNCI_TOKEN, TOKEN); } catch (err) { /* abaikan */ }
        lukisApp();
      } catch (err) {
        m.className = 'mesej-borang ralat';
        m.textContent = err.message;
        btn.disabled = false;
        btn.textContent = 'Log masuk';
        input.select();
      }
    });
  }


  /* ================= RANGKA PANEL ADMIN ================= */

  function lukisApp() {
    document.title = 'Panel admin';
    const nav = MENU_ADMIN.map(function (m) {
      if (m.pemisah) return '<span class="sisi-pemisah" aria-hidden="true"></span>';
      return '<button type="button" data-seksyen="' + m.id + '">' + esc(m.label) +
        (m.id === 'aduan' ? '<span class="lencana" id="lencanaAduan" hidden></span>' : '') +
        (m.lencana ? '<span class="lencana lencana-ai" id="' + m.lencana + '" hidden></span>' : '') + '</button>';
    }).join('');

    skrin().innerHTML =
      '<div class="admin">' +
        '<aside class="sisi">' +
          '<div class="sisi-jenama"><span class="lambang" data-lambang aria-hidden="true"></span>' +
            '<div><strong>Panel admin</strong><small data-nama-sekolah></small></div></div>' +
          '<nav class="sisi-nav" aria-label="Menu admin">' + nav + '</nav>' +
          '<div class="sisi-bawah">' +
            '<a href="index.html" target="_blank" rel="noopener">Lihat laman web</a>' +
            '<button type="button" id="btnLogKeluar">Log keluar</button>' +
          '</div>' +
        '</aside>' +
        '<main class="utama" id="utama" tabindex="-1"></main>' +
      '</div>';
    isiLambang();

    document.querySelector('.sisi-nav').addEventListener('click', function (e) {
      const b = e.target.closest('[data-seksyen]');
      if (b) bukaSeksyen(b.dataset.seksyen);
    });

    document.getElementById('btnLogKeluar').addEventListener('click', function () {
      const t = TOKEN;
      TOKEN = null;
      try { sessionStorage.removeItem(KUNCI_TOKEN); } catch (e) { /* abaikan */ }
      lukisLogin('Anda telah log keluar.', 'berjaya');
      if (t) fetch(API, { method: 'POST', body: JSON.stringify({ action: 'logout', token: t }) }).catch(function () {});
    });

    const awal = location.hash.slice(1);
    bukaSeksyen(TAJUK_SEKSYEN[awal] ? awal : 'homepage');
    muatTab('Aduan').then(kemaskiniLencana).catch(function () {});
    muatTab('Pengumuman').then(kemaskiniLencanaAI).catch(function () {});
  }

  function bukaSeksyen(id, sub) {
    document.querySelectorAll('[data-seksyen]').forEach(function (b) {
      if (b.dataset.seksyen === id) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    history.replaceState(null, '', '#' + id);

    const t = TAJUK_SEKSYEN[id];
    const u = document.getElementById('utama');
    u.innerHTML = '<div class="kepala-seksyen"><h1>' + esc(t[0]) + '</h1><p>' + esc(t[1]) + '</p></div><div id="isiSeksyen"></div>';
    const isi = document.getElementById('isiSeksyen');

    if (id === 'homepage') lukisHomepage(isi, sub || 'maklumat');
    else if (id === 'ai') lukisAI(isi);
    else if (id === 'aduan') lukisAduan(isi, 'Semua');
    else if (id === 'kataLaluan') lukisKataLaluan(isi);
    else lukisModulRekod(isi, id);
    window.scrollTo(0, 0);
  }


  /* ================= MEDAN BORANG ================= */

  function nilaiAsal(m) {
    if (m.jenis === 'date') return hariIni();
    if (m.jenis === 'select') return typeof m.pilihan[0] === 'object' ? m.pilihan[0].v : m.pilihan[0];
    return '';
  }

  function medanHTML(m, v) {
    v = v == null ? '' : String(v);
    const id = 'm_' + String(m.n).replace(/[^\w]/g, '_');
    if (m.jenis === 'gambar') return medanGambarHTML(m, v, id);

    const bantu = m.bantu ? '<small class="bantu" id="' + id + '_b">' + esc(m.bantu) + '</small>' : '';
    const atr = ' name="' + esc(m.n) + '" id="' + id + '"' +
      (m.bantu ? ' aria-describedby="' + id + '_b"' : '') +
      (m.wajib ? ' required' : '') +
      (m.auto ? ' autocomplete="' + m.auto + '"' : '');

    let kawalan;
    if (m.jenis === 'textarea') {
      kawalan = '<textarea' + atr + ' rows="' + (m.baris || 6) + '">' + esc(v) + '</textarea>';
    } else if (m.jenis === 'select') {
      kawalan = '<select' + atr + '>' + m.pilihan.map(function (p) {
        const nilai = typeof p === 'object' ? p.v : p;
        const label = typeof p === 'object' ? p.l : p;
        return '<option value="' + esc(nilai) + '"' + (nilai === v ? ' selected' : '') + '>' + esc(label) + '</option>';
      }).join('') + '</select>';
    } else if (m.jenis === 'kategori') {
      kawalan = '<input type="text"' + atr + ' value="' + esc(v) + '" list="' + id + '_dl" autocomplete="off">' +
        '<datalist id="' + id + '_dl">' + m.pilihan.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('') + '</datalist>';
    } else if (m.jenis === 'date') {
      kawalan = '<input type="date"' + atr + ' value="' + esc(v.slice(0, 10)) + '">';
    } else {
      kawalan = '<input type="' + (m.jenis || 'text') + '"' + atr + ' value="' + esc(v) + '">';
    }
    return '<div class="medan"><label for="' + id + '">' + esc(m.l || m.n) + (m.wajib ? ' <span class="wajib">*</span>' : '') + '</label>' + kawalan + bantu + '</div>';
  }

  function medanGambarHTML(m, v, id) {
    return '<div class="medan medan-gambar" data-satu="' + (m.satu ? 1 : 0) + '" data-png="' + (m.png ? 1 : 0) + '">' +
      '<span class="label-medan" id="' + id + '_l">' + esc(m.l || m.n) + '</span>' +
      '<input type="hidden" name="' + esc(m.n) + '" value="' + esc(v) + '">' +
      '<div class="pratonton"></div>' +
      '<button type="button" class="butang butang-biasa pilih-gambar" aria-describedby="' + id + '_l">' + (m.satu ? 'Pilih gambar' : 'Tambah gambar') + '</button>' +
      '<input type="file" accept="image/*"' + (m.satu ? '' : ' multiple') + ' hidden>' +
      '<small class="bantu">' + (m.bantu ? esc(m.bantu) + ' ' : '') + 'Gambar dikecilkan secara automatik sebelum dimuat naik.</small>' +
      '<div class="status-muat" aria-live="polite"></div>' +
    '</div>';
  }

  // Kecilkan gambar dalam pelayar sebelum dihantar (lebih laju & jimat ruang Drive)
  function mampat(fail, kekalPng) {
    return new Promise(function (res, rej) {
      if (!/^image\//.test(fail.type)) return rej(new Error(fail.name + ' bukan fail gambar.'));
      const url = URL.createObjectURL(fail);
      const img = new Image();
      img.onload = function () {
        const MAKS = 1600;
        const skala = Math.min(1, MAKS / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * skala);
        const h = Math.round(img.naturalHeight * skala);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        const jenis = (kekalPng && fail.type === 'image/png') ? 'image/png' : 'image/jpeg';
        if (jenis === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const dataUrl = c.toDataURL(jenis, 0.82);
        res({
          nama: fail.name.replace(/\.[^.]+$/, '') + (jenis === 'image/png' ? '.png' : '.jpg'),
          jenis: jenis,
          data: dataUrl.split(',')[1]
        });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        rej(new Error('Gambar ' + fail.name + ' tidak dapat dibaca. Gunakan format JPG atau PNG.'));
      };
      img.src = url;
    });
  }

  function pasangMedanGambar(root) {
    root.querySelectorAll('.medan-gambar').forEach(function (w) {
      const simpanan = w.querySelector('input[type="hidden"]');
      const input = w.querySelector('input[type="file"]');
      const pratonton = w.querySelector('.pratonton');
      const status = w.querySelector('.status-muat');
      const satu = w.dataset.satu === '1';
      const png = w.dataset.png === '1';

      function senarai() { return simpanan.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean); }
      function lukis() {
        pratonton.innerHTML = senarai().map(function (u, i) {
          return '<div class="gambar-kecil"><img src="' + esc(saiz(urlGambar(u), 240)) + '" alt="Gambar ' + (i + 1) + '">' +
            '<button type="button" class="buang" data-buang="' + i + '" aria-label="Buang gambar ' + (i + 1) + '">×</button></div>';
        }).join('');
      }
      lukis();

      pratonton.addEventListener('click', function (e) {
        const b = e.target.closest('[data-buang]');
        if (!b) return;
        const s = senarai();
        s.splice(Number(b.dataset.buang), 1);
        simpanan.value = s.join(',');
        lukis();
        status.className = 'status-muat';
        status.textContent = 'Gambar dibuang. Tekan Simpan untuk menyimpan perubahan.';
      });

      w.querySelector('.pilih-gambar').addEventListener('click', function () { input.click(); });

      input.addEventListener('change', async function () {
        const fail = Array.prototype.slice.call(input.files);
        input.value = '';
        if (!fail.length) return;
        w.dataset.sibuk = '1';
        status.className = 'status-muat';
        for (let i = 0; i < fail.length; i++) {
          status.textContent = 'Memuat naik gambar ' + (i + 1) + ' daripada ' + fail.length + '…';
          try {
            const data = await mampat(fail[i], png);
            const j = await panggil('muatNaikGambar', { fail: data });
            const s = satu ? [] : senarai();
            s.push(j.url);
            simpanan.value = s.join(',');
            lukis();
          } catch (err) {
            status.className = 'status-muat ralat';
            status.textContent = err.message;
            w.dataset.sibuk = '0';
            return;
          }
        }
        w.dataset.sibuk = '0';
        status.textContent = 'Gambar berjaya dimuat naik. Tekan Simpan untuk menyimpan perubahan.';
      });
    });
  }

  function sibuk(f) {
    if (f.querySelector('.medan-gambar[data-sibuk="1"]')) {
      toast('Tunggu sehingga gambar selesai dimuat naik.', 'ralat');
      return true;
    }
    return false;
  }

  function kumpul(f, medan) {
    const o = {};
    medan.forEach(function (m) {
      const el = f.elements[m.n];
      if (!el) return;
      let v = String(el.value).trim();
      // Tambah https:// secara automatik jika guru terlupa
      if (m.jenis === 'url' && v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
      o[m.n] = v;
    });
    return o;
  }

  function semakWajib(f, medan) {
    for (let i = 0; i < medan.length; i++) {
      const m = medan[i];
      if (!m.wajib) continue;
      const el = f.elements[m.n];
      if (!el || !String(el.value).trim()) {
        toast('Sila isi ' + (m.l || m.n).toLowerCase() + '.', 'ralat');
        if (el && el.focus) el.focus();
        return false;
      }
    }
    return true;
  }

  async function denganButang(btn, teksSibuk, tugas) {
    const asal = btn.textContent;
    btn.disabled = true;
    btn.textContent = teksSibuk;
    try { await tugas(); }
    catch (err) { toast(err.message, 'ralat'); }
    finally { btn.disabled = false; btn.textContent = asal; }
  }


  /* ================= HOMEPAGE ================= */

  function lukisHomepage(isi, sub) {
    isi.innerHTML =
      '<div class="subtab" role="tablist">' +
        '<button type="button" role="tab" data-sub="maklumat" aria-selected="' + (sub === 'maklumat') + '">Maklumat sekolah</button>' +
        '<button type="button" role="tab" data-sub="pengumuman" aria-selected="' + (sub === 'pengumuman') + '">Pengumuman</button>' +
      '</div><div id="isiSub"></div>';
    isi.querySelectorAll('[data-sub]').forEach(function (b) {
      b.addEventListener('click', function () { lukisHomepage(isi, b.dataset.sub); });
    });
    const s = document.getElementById('isiSub');
    if (sub === 'maklumat') lukisBorangTetapan(s);
    else lukisModulRekod(s, 'pengumuman');
  }

  async function lukisBorangTetapan(bekas) {
    bekas.innerHTML = memuatKecil();
    let t;
    try { t = await muatTab('Tetapan'); }
    catch (e) { bekas.innerHTML = ralatMuat(e.message); return; }

    const semuaMedan = [];
    bekas.innerHTML = '<form class="borang-admin" novalidate>' +
      MEDAN_TETAPAN.map(function (k) {
        return '<fieldset><legend>' + esc(k.legend) + '</legend>' +
          k.medan.map(function (m) { semuaMedan.push(m); return medanHTML(m, t[m.n]); }).join('') +
        '</fieldset>';
      }).join('') +
      '<div class="borang-tindakan"><button type="submit" class="butang butang-emas">Simpan maklumat</button></div>' +
    '</form>';

    const f = bekas.querySelector('form');
    pasangMedanGambar(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sibuk(f) || !semakWajib(f, semuaMedan)) return;
      const data = kumpul(f, semuaMedan);
      denganButang(f.querySelector('[type="submit"]'), 'Menyimpan…', async function () {
        await panggil('simpanTetapan', { data: data });
        batalCache('Tetapan');
        namaSekolah = data.nama_sekolah;
        logoSekolah = data.logo;
        isiLambang();
        toast('Maklumat sekolah disimpan.');
      });
    });
  }


  /* ================= MODUL REKOD (senarai + borang) ================= */

  function barisRekod(k, x) {
    let dom = '';
    try { dom = x.URL ? new URL(x.URL).hostname.replace(/^www\./, '') : ''; } catch (e) { /* abaikan */ }
    const g = saiz(urlGambar(String(x.Gambar || x.Logo || '').split(',')[0]), 160) ||
      (dom ? 'https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(dom) : '');
    const meta = [];
    if (dom) meta.push('<span>' + esc(dom) + '</span>');
    if (k.tab === 'Submenu') {
      meta.push('<span><strong>' + esc(labelDari(MENU_AWAM, x.Menu)) + '</strong></span>');
      meta.push('<span>' + esc(labelDari(JENIS_SUBMENU, x.Jenis)) + '</span>');
      if (/^sembunyi/i.test(x.Status || '')) meta.push('<span class="status status-draf">Tersembunyi</span>');
    }
    if (x.Oleh === 'AI') meta.push('<span class="status status-ai">Cadangan AI</span>');
    if (x.Status === 'Draf') meta.push('<span class="status status-draf">Draf</span>');
    if (x.Jawatan) meta.push('<span>' + esc(x.Jawatan) + '</span>');
    if (x.Kategori) meta.push('<span>' + esc(x.Kategori) + '</span>');
    if (x.Tarikh) meta.push('<span>' + formatTarikh(x.Tarikh) + '</span>');
    if (k.susun && x.Susunan && k.tab !== 'Submenu') meta.push('<span>Susunan ' + esc(x.Susunan) + '</span>');
    if (x.Video) meta.push('<span>Ada video</span>');

    return '<div class="rekod">' +
      '<div class="rekod-gambar">' + (g ? '<img src="' + esc(g) + '" alt="" loading="lazy">' : esc(inisial(x[k.lajurTajuk]))) + '</div>' +
      '<div class="rekod-teks"><strong>' + esc(x[k.lajurTajuk]) + '</strong><div class="rekod-meta">' + meta.join('') + '</div></div>' +
      '<div class="rekod-tindakan">' +
        (k.tab === 'Pengumuman' && x.Status === 'Draf' ? '<button type="button" class="butang-kecil terbit" data-terbit="' + esc(x.ID) + '">Terbit</button>' : '') +
        '<button type="button" class="butang-kecil" data-edit="' + esc(x.ID) + '">Edit</button>' +
        '<button type="button" class="butang-kecil bahaya" data-padam="' + esc(x.ID) + '">Padam</button>' +
      '</div>' +
    '</div>';
  }

  async function lukisModulRekod(bekas, kunci) {
    const k = KONFIG[kunci];
    bekas.innerHTML =
      '<div class="alat">' +
        '<input type="search" class="cari" placeholder="Cari ' + esc(k.namaItem) + '" aria-label="Cari ' + esc(k.namaItem) + '">' +
        '<button type="button" class="butang butang-emas" data-tambah>Tambah ' + esc(k.namaItem) + '</button>' +
      '</div>' +
      '<div class="senarai-bekas">' + memuatKecil() + '</div>';
    const borang = k.borang || lukisBorangRekod;
    bekas.querySelector('[data-tambah]').addEventListener('click', function () { borang(bekas, kunci, null); });

    const sb = bekas.querySelector('.senarai-bekas');
    let data;
    try { data = await muatTab(k.tab); }
    catch (e) { sb.innerHTML = ralatMuat(e.message); return; }
    if (k.tab === 'Pengumuman') kemaskiniLencanaAI(data);
    if (k.urut) data = data.slice().sort(k.urut);
    else if (k.susun) data = data.slice().sort(function (a, b) { return (Number(a.Susunan) || 999) - (Number(b.Susunan) || 999); });

    function lukis(q) {
      q = (q || '').toLowerCase();
      const d = data.filter(function (x) { return !q || Object.values(x).join(' ').toLowerCase().indexOf(q) !== -1; });
      if (!data.length) sb.innerHTML = '<div class="kosong"><p>Belum ada ' + esc(k.namaItem) + '. Klik butang Tambah ' + esc(k.namaItem) + ' untuk bermula.</p></div>';
      else if (!d.length) sb.innerHTML = '<div class="kosong"><p>Tiada hasil untuk carian ini.</p></div>';
      else sb.innerHTML = '<div class="senarai-rekod">' + d.map(function (x) { return barisRekod(k, x); }).join('') + '</div>';
    }
    lukis('');
    bekas.querySelector('.cari').addEventListener('input', function (e) { lukis(e.target.value); });

    sb.addEventListener('click', async function (e) {
      const ed = e.target.closest('[data-edit]');
      const pd = e.target.closest('[data-padam]');
      const tb = e.target.closest('[data-terbit]');
      if (tb) {
        tb.disabled = true;
        tb.textContent = 'Menerbit…';
        try {
          await panggil('kemaskini', { tab: k.tab, id: tb.dataset.terbit, data: { Status: 'Terbit' } });
          batalCache(k.tab);
          toast('Pengumuman diterbitkan di website.');
          lukisModulRekod(bekas, kunci);
        } catch (err) {
          toast(err.message, 'ralat');
          tb.disabled = false;
          tb.textContent = 'Terbit';
        }
      } else if (ed) {
        borang(bekas, kunci, data.find(function (x) { return x.ID === ed.dataset.edit; }));
      } else if (pd) {
        const item = data.find(function (x) { return x.ID === pd.dataset.padam; });
        if (!confirm('Padam "' + item[k.lajurTajuk] + '"?\nTindakan ini tidak boleh dibatalkan.')) return;
        pd.disabled = true;
        pd.textContent = 'Memadam…';
        try {
          await panggil('padam', { tab: k.tab, id: item.ID });
          batalCache(k.tab);
          toast('Berjaya dipadam.');
          lukisModulRekod(bekas, kunci);
        } catch (err) {
          toast(err.message, 'ralat');
          pd.disabled = false;
          pd.textContent = 'Padam';
        }
      }
    });
  }

  function lukisBorangRekod(bekas, kunci, item) {
    const k = KONFIG[kunci];
    const baru = !item;
    function nilai(m) {
      if (!baru) return item[m.n];
      if (m.n === 'Susunan' && k.susun) return String((CACHE[k.tab] || []).length + 1);
      return nilaiAsal(m);
    }

    bekas.innerHTML = '<form class="borang-admin" novalidate>' +
      '<h2>' + (baru ? 'Tambah ' : 'Edit ') + esc(k.namaItem) + '</h2>' +
      k.medan.map(function (m) { return medanHTML(m, nilai(m)); }).join('') +
      '<div class="borang-tindakan">' +
        '<button type="submit" class="butang butang-emas">' + (baru ? 'Simpan' : 'Simpan perubahan') + '</button>' +
        '<button type="button" class="butang butang-biasa" data-batal>Batal</button>' +
      '</div>' +
    '</form>';

    const f = bekas.querySelector('form');
    pasangMedanGambar(f);
    f.querySelector('[data-batal]').addEventListener('click', function () { lukisModulRekod(bekas, kunci); });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sibuk(f) || !semakWajib(f, k.medan)) return;
      const data = kumpul(f, k.medan);
      denganButang(f.querySelector('[type="submit"]'), 'Menyimpan…', async function () {
        if (baru) await panggil('tambah', { tab: k.tab, data: data });
        else await panggil('kemaskini', { tab: k.tab, id: item.ID, data: data });
        batalCache(k.tab);
        toast(baru ? 'Berjaya ditambah.' : 'Perubahan disimpan.');
        lukisModulRekod(bekas, kunci);
      });
    });
    window.scrollTo(0, 0);
    const pertama = f.querySelector('input:not([type="hidden"]), textarea');
    if (pertama) pertama.focus();
  }


  /* ================= SUBMENU & EMBED ================= */

  const SKRIP_TINGGI = '<script>(function(){function h(){try{var b=document.body;if(!b)return;var c=getComputedStyle(b);parent.postMessage({tinggiBenam:Math.ceil(b.offsetHeight+parseFloat(c.marginTop)+parseFloat(c.marginBottom))},"*")}catch(e){}}addEventListener("load",h);if(window.ResizeObserver){new ResizeObserver(h).observe(document.documentElement)}setInterval(h,1500);h()})();<\/script>';

  function binaBenam(bekas, o) {
    let url = o.url || '';
    let kod = o.kod || '';
    let tinggi = Number(o.tinggi) || 0;
    const iframeSahaja = kod.match(/^\s*<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/iframe>\s*$/i);
    if (iframeSahaja) {
      url = iframeSahaja[1].replace(/&amp;/g, '&');
      const h = kod.match(/\bheight=["']?(\d+)/i);
      if (!tinggi && h) tinggi = Number(h[1]);
      kod = '';
    }
    const f = document.createElement('iframe');
    f.className = 'benam';
    f.title = 'Pratonton';
    f.setAttribute('allowfullscreen', '');
    if (url) {
      if (!/^https:\/\//.test(url)) { bekas.innerHTML = ralatMuat('Pautan mesti bermula dengan https://'); return; }
      f.src = url;
      f.style.height = (tinggi || 800) + 'px';
    } else {
      f.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads' + (o.aksesPenuh ? ' allow-same-origin' : ''));
      f.style.height = (tinggi || 600) + 'px';
      f.srcdoc = kod + (tinggi ? '' : SKRIP_TINGGI);
      if (!tinggi) {
        window.addEventListener('message', function (e) {
          if (e.source === f.contentWindow && e.data && typeof e.data.tinggiBenam === 'number') {
            f.style.height = Math.min(Math.max(e.data.tinggiBenam + 4, 150), 20000) + 'px';
          }
        });
      }
    }
    bekas.innerHTML = '';
    bekas.appendChild(f);
  }

  function lukisBorangSubmenu(bekas, kunci, item) {
    const baru = !item;
    const x = item || {};
    const mMenu = { n: 'Menu', l: 'Menu induk', jenis: 'select', pilihan: MENU_AWAM, bantu: 'Submenu akan dipaparkan di bawah menu ini.' };
    const mTajuk = { n: 'Tajuk', l: 'Nama submenu', wajib: true, bantu: 'Contoh: Unit beruniform, Rumah sukan, Minit mesyuarat.' };
    const mJenis = { n: 'Jenis', l: 'Jenis halaman', jenis: 'select', pilihan: JENIS_SUBMENU };
    const mKandungan = { n: 'Kandungan', l: 'Kandungan', jenis: 'textarea', baris: 10, bantu: 'Tekan Enter dua kali untuk memulakan perenggan baharu.' };
    const mGambar = { n: 'Gambar', l: 'Gambar (pilihan)', jenis: 'gambar' };
    const mKod = { n: 'KodEmbed', l: 'Kod HTML atau pautan embed', jenis: 'textarea', baris: 14,
      bantu: 'Tampal kod HTML penuh sistem anda, kod benam (iframe) daripada Google Form atau Google Sheets, atau pautan https:// sahaja.' };
    const mTinggi = { n: 'Tinggi', l: 'Ketinggian dalam piksel (pilihan)', jenis: 'number',
      bantu: 'Biarkan kosong untuk ketinggian automatik. Isi (contohnya 900) jika paparan terpotong atau terlalu panjang.' };
    const mPautan = { n: 'Pautan', l: 'Alamat laman', jenis: 'url', bantu: 'Laman ini akan dibuka dalam tab baharu apabila submenu diklik.' };
    const mSusunan = { n: 'Susunan', l: 'Susunan dalam menu', jenis: 'number', bantu: 'Nombor kecil dipaparkan dahulu.' };
    const mStatus = { n: 'Status', l: 'Status', jenis: 'select', pilihan: ['Papar', 'Sembunyi'], bantu: 'Submenu tersembunyi tidak dipaparkan kepada orang awam.' };

    bekas.innerHTML = '<form class="borang-admin" novalidate>' +
      '<h2>' + (baru ? 'Tambah submenu' : 'Edit submenu') + '</h2>' +
      medanHTML(mMenu, x.Menu || 'kokurikulum') +
      medanHTML(mTajuk, x.Tajuk) +
      medanHTML(mJenis, x.Jenis || 'teks') +
      '<div class="kumpulan-jenis" data-jenis="teks">' + medanHTML(mKandungan, x.Kandungan) + medanHTML(mGambar, x.Gambar) + '</div>' +
      '<div class="kumpulan-jenis" data-jenis="embed">' +
        medanHTML(mKod, (x.Jenis === 'embed' && !x.FailEmbed) ? x.Pautan : '') +
        medanHTML(mTinggi, x.Tinggi) +
        '<label class="semak"><input type="checkbox" name="AksesPenuh"' + (x.AksesPenuh === 'Ya' ? ' checked' : '') + '> Benarkan akses penuh</label>' +
        '<small class="bantu bantu-semak">Aktifkan hanya jika sistem yang dibenamkan tidak berfungsi dengan betul (contohnya perlu menyimpan data dalam pelayar) dan anda mempercayai sepenuhnya sumber kod tersebut.</small>' +
        '<div class="baris-butang"><button type="button" class="butang butang-biasa" data-pratonton>Pratonton</button></div>' +
        '<div class="pratonton-benam" hidden></div>' +
      '</div>' +
      '<div class="kumpulan-jenis" data-jenis="pautan">' + medanHTML(mPautan, x.Jenis === 'pautan' ? x.Pautan : '') + '</div>' +
      medanHTML(mSusunan, baru ? String((CACHE.Submenu || []).length + 1) : x.Susunan) +
      medanHTML(mStatus, x.Status || 'Papar') +
      '<div class="borang-tindakan">' +
        '<button type="submit" class="butang butang-emas">' + (baru ? 'Simpan' : 'Simpan perubahan') + '</button>' +
        '<button type="button" class="butang butang-biasa" data-batal>Batal</button>' +
      '</div>' +
    '</form>';

    const f = bekas.querySelector('form');
    const ta = f.elements.KodEmbed;
    pasangMedanGambar(f);

    function tukarJenis() {
      const j = f.elements.Jenis.value;
      f.querySelectorAll('.kumpulan-jenis').forEach(function (g) { g.hidden = g.dataset.jenis !== j; });
    }
    tukarJenis();
    f.elements.Jenis.addEventListener('change', tukarJenis);

    // Muatkan kod HTML sedia ada dari Google Drive
    let kodSedia = baru || !x.FailEmbed;
    if (!kodSedia) {
      ta.disabled = true;
      ta.placeholder = 'Memuatkan kod…';
      panggil('bacaEmbedAdmin', { id: x.ID }).then(function (j) {
        ta.value = j.data.html;
        kodSedia = true;
      }).catch(function (err) {
        toast('Kod tidak dapat dimuatkan: ' + err.message, 'ralat');
        ta.placeholder = 'Kod tidak dapat dimuatkan. Muat semula halaman dan cuba lagi.';
      }).finally(function () { ta.disabled = false; if (kodSedia) ta.placeholder = ''; });
    }

    f.querySelector('[data-pratonton]').addEventListener('click', function () {
      const kod = ta.value.trim();
      const kotak = f.querySelector('.pratonton-benam');
      if (!kod) { toast('Tampal kod HTML atau pautan dahulu.', 'ralat'); return; }
      kotak.hidden = false;
      const adalahUrl = /^https?:\/\/\S+$/.test(kod);
      binaBenam(kotak, { url: adalahUrl ? kod : '', kod: adalahUrl ? '' : kod, tinggi: f.elements.Tinggi.value, aksesPenuh: f.elements.AksesPenuh.checked });
    });

    f.querySelector('[data-batal]').addEventListener('click', function () { lukisModulRekod(bekas, kunci); });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sibuk(f)) return;
      const j = f.elements.Jenis.value;
      const d = {
        Menu: f.elements.Menu.value,
        Tajuk: f.elements.Tajuk.value.trim(),
        Jenis: j,
        Susunan: f.elements.Susunan.value.trim(),
        Status: f.elements.Status.value
      };
      if (!d.Tajuk) { toast('Sila isi nama submenu.', 'ralat'); f.elements.Tajuk.focus(); return; }

      if (j === 'teks') {
        d.Kandungan = f.elements.Kandungan.value.trim();
        d.Gambar = f.elements.Gambar.value;
        d.Pautan = '';
      } else if (j === 'embed') {
        if (!kodSedia) { toast('Kod masih dimuatkan atau gagal dimuatkan. Sila tunggu atau muat semula halaman.', 'ralat'); return; }
        const kod = ta.value.trim();
        if (!kod) { toast('Sila tampal kod HTML atau pautan embed.', 'ralat'); ta.focus(); return; }
        if (/^https?:\/\/\S+$/.test(kod)) { d.Pautan = kod; d.KodEmbed = ''; }
        else { d.KodEmbed = kod; d.Pautan = ''; }
        d.Tinggi = f.elements.Tinggi.value.trim();
        d.AksesPenuh = f.elements.AksesPenuh.checked ? 'Ya' : '';
      } else {
        let u = f.elements.Pautan.value.trim();
        if (!u) { toast('Sila isi alamat laman.', 'ralat'); f.elements.Pautan.focus(); return; }
        if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
        d.Pautan = u;
      }

      denganButang(f.querySelector('[type="submit"]'), 'Menyimpan…', async function () {
        if (baru) await panggil('tambah', { tab: 'Submenu', data: d });
        else await panggil('kemaskini', { tab: 'Submenu', id: x.ID, data: d });
        batalCache('Submenu');
        toast(baru ? 'Submenu berjaya ditambah.' : 'Perubahan disimpan.');
        lukisModulRekod(bekas, kunci);
      });
    });
    window.scrollTo(0, 0);
  }


  /* ================= ADUAN ================= */

  const STATUS_ADUAN = ['Baru', 'Dalam tindakan', 'Selesai'];
  const KELAS_STATUS = { 'Baru': 'status-baru', 'Dalam tindakan': 'status-tindakan', 'Selesai': 'status-selesai' };

  function kemaskiniLencana(data) {
    const el = document.getElementById('lencanaAduan');
    if (!el || !data) return;
    const n = data.filter(function (x) { return (x.Status || 'Baru') === 'Baru'; }).length;
    el.textContent = n;
    el.hidden = n === 0;
    el.setAttribute('aria-label', n + ' aduan baru');
  }

  function barisAduan(x) {
    const s = x.Status || 'Baru';
    return '<div class="rekod rekod-aduan">' +
      '<div class="rekod-teks"><strong>' + esc(x.Nama) + '</strong>' +
        '<div class="rekod-meta"><span class="status ' + (KELAS_STATUS[s] || 'status-draf') + '">' + esc(s) + '</span>' +
        '<span>' + esc(x.Kategori) + '</span><span>' + formatTarikh(x.Tarikh) + '</span></div>' +
        '<p class="rekod-ringkas">' + esc(ringkas(x.Aduan, 140)) + '</p>' +
      '</div>' +
      '<div class="rekod-tindakan"><button type="button" class="butang-kecil" data-lihat="' + esc(x.ID) + '">Lihat</button></div>' +
    '</div>';
  }

  async function lukisAduan(bekas, penapis) {
    bekas.onclick = null;
    bekas.innerHTML = memuatKecil();
    let data;
    try { data = await muatTab('Aduan'); }
    catch (e) { bekas.innerHTML = ralatMuat(e.message); return; }
    kemaskiniLencana(data);

    function statusDi(x) { return x.Status || 'Baru'; }
    function kira(s) { return s === 'Semua' ? data.length : data.filter(function (x) { return statusDi(x) === s; }).length; }
    const d = penapis === 'Semua' ? data : data.filter(function (x) { return statusDi(x) === penapis; });

    bekas.innerHTML =
      '<div class="penapis" role="group" aria-label="Tapis mengikut status">' +
        ['Semua'].concat(STATUS_ADUAN).map(function (s) {
          return '<button type="button" class="cip' + (s === penapis ? ' aktif' : '') + '" aria-pressed="' + (s === penapis) + '" data-status="' + s + '">' + s + ' (' + kira(s) + ')</button>';
        }).join('') +
      '</div>' +
      (d.length
        ? '<div class="senarai-rekod">' + d.map(barisAduan).join('') + '</div>'
        : '<div class="kosong"><p>' + (penapis === 'Semua' ? 'Belum ada aduan diterima.' : 'Tiada aduan dengan status ini.') + '</p></div>');

    bekas.onclick = function (e) {
      const c = e.target.closest('[data-status]');
      if (c) return lukisAduan(bekas, c.dataset.status);
      const l = e.target.closest('[data-lihat]');
      if (l) lukisButiranAduan(bekas, data.find(function (x) { return x.ID === l.dataset.lihat; }), penapis);
    };
  }

  function lukisButiranAduan(bekas, x, penapis) {
    bekas.onclick = null;
    const jam = String(x.Tarikh || '').slice(11, 16);
    const tel = String(x.Telefon || '').replace(/[^\d+]/g, '');
    const medanStatus = { n: 'Status', l: 'Status', jenis: 'select', pilihan: STATUS_ADUAN };
    const medanCatatan = { n: 'Maklum Balas', l: 'Catatan tindakan', jenis: 'textarea', baris: 4,
      bantu: 'Catatan dalaman untuk rujukan guru. Tidak dipaparkan kepada orang awam.' };

    bekas.innerHTML =
      '<div class="borang-admin">' +
        '<button type="button" class="pautan-kembali" data-kembali>← Kembali ke senarai aduan</button>' +
        '<h2>Aduan daripada ' + esc(x.Nama) + '</h2>' +
        '<dl class="butiran">' +
          '<dt>No. rujukan</dt><dd>' + esc(x.ID) + '</dd>' +
          '<dt>Tarikh</dt><dd>' + formatTarikh(x.Tarikh) + (jam ? ', ' + esc(jam) : '') + '</dd>' +
          '<dt>Kategori</dt><dd>' + esc(x.Kategori || '-') + '</dd>' +
          '<dt>Emel</dt><dd>' + (x.Emel ? '<a href="mailto:' + esc(x.Emel) + '">' + esc(x.Emel) + '</a>' : 'Tidak diberikan') + '</dd>' +
          '<dt>Telefon</dt><dd>' + (tel ? '<a href="tel:' + esc(tel) + '">' + esc(x.Telefon) + '</a>' : 'Tidak diberikan') + '</dd>' +
        '</dl>' +
        '<div class="kotak-aduan">' + esc(x.Aduan) + '</div>' +
        '<form novalidate>' +
          medanHTML(medanStatus, x.Status || 'Baru') +
          medanHTML(medanCatatan, x['Maklum Balas']) +
          '<div class="borang-tindakan">' +
            '<button type="submit" class="butang butang-emas">Simpan</button>' +
            '<button type="button" class="butang-kecil bahaya" data-padam>Padam aduan</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    bekas.querySelector('[data-kembali]').addEventListener('click', function () { lukisAduan(bekas, penapis); });

    const f = bekas.querySelector('form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = kumpul(f, [medanStatus, medanCatatan]);
      denganButang(f.querySelector('[type="submit"]'), 'Menyimpan…', async function () {
        await panggil('kemaskini', { tab: 'Aduan', id: x.ID, data: data });
        batalCache('Aduan');
        toast('Status aduan disimpan.');
        lukisAduan(bekas, penapis);
      });
    });

    f.querySelector('[data-padam]').addEventListener('click', function (e) {
      if (!confirm('Padam aduan daripada ' + x.Nama + '?\nTindakan ini tidak boleh dibatalkan.')) return;
      denganButang(e.currentTarget, 'Memadam…', async function () {
        await panggil('padam', { tab: 'Aduan', id: x.ID });
        batalCache('Aduan');
        toast('Aduan dipadam.');
        lukisAduan(bekas, penapis);
      });
    });
    window.scrollTo(0, 0);
  }


  /* ================= PEMBANTU AI ================= */

  function kemaskiniLencanaAI(data) {
    const el = document.getElementById('lencanaAI');
    if (!el || !data) return;
    const n = data.filter(function (x) { return x.Oleh === 'AI' && x.Status === 'Draf'; }).length;
    el.textContent = n;
    el.hidden = n === 0;
    el.setAttribute('aria-label', n + ' cadangan AI menunggu semakan');
  }

  async function lukisAI(bekas) {
    bekas.innerHTML = memuatKecil();
    let t;
    try { t = (await panggil('tetapanAI')).data; }
    catch (e) { bekas.innerHTML = ralatMuat(e.message); return; }
    const log = t.log;

    const medanKunci = { n: 'kunci', l: 'Kunci API Gemini', jenis: 'password', auto: 'off',
      bantu: t.adaKunci
        ? 'Kunci sudah disimpan dengan selamat. Biarkan kosong untuk mengekalkannya, atau tampal kunci baharu untuk menggantikannya.'
        : 'Dapatkan kunci percuma di aistudio.google.com: log masuk dengan akaun Google, klik Get API key, kemudian Create API key. Salin kunci tersebut dan tampal di sini.' };
    const medanKataKunci = { n: 'kataKunci', l: 'Kata kunci carian', jenis: 'textarea', baris: 8,
      bantu: 'Satu kata kunci setiap baris. {TAHUN} akan ditukar kepada tahun semasa secara automatik.' };
    const medanModel = { n: 'model', l: 'Nama model AI',
      bantu: 'Biarkan kosong untuk pilihan automatik. Isi hanya jika diminta, contohnya gemini-2.5-flash.' };

    bekas.innerHTML =
      '<div class="panel-status">' +
        '<div><span>Kunci API</span><strong>' + (t.adaKunci ? 'Sudah ditetapkan' : 'Belum ditetapkan') + '</strong></div>' +
        '<div><span>Carian automatik</span><strong>' + (t.aktif ? 'Aktif setiap hari, selepas 7 pagi' : 'Tidak aktif') + '</strong></div>' +
        '<div><span>Carian terakhir</span><strong>' + (log ? esc(log.masa) : 'Belum pernah') + '</strong>' +
          (log ? '<small class="' + (log.ralat ? 'teks-ralat' : '') + '">' + esc(log.mesej) + '</small>' : '') + '</div>' +
      '</div>' +
      '<div class="baris-butang">' +
        '<button type="button" class="butang butang-emas" id="btnCariSekarang">Cari berita sekarang</button>' +
        '<button type="button" class="butang butang-biasa" id="btnLihatDraf">Semak cadangan AI</button>' +
      '</div>' +
      '<form class="borang-admin" novalidate>' +
        '<h2>Tetapan</h2>' +
        medanHTML(medanKunci, '') +
        '<label class="semak"><input type="checkbox" name="aktif"' + (t.aktif ? ' checked' : '') + '> Aktifkan carian automatik setiap hari (selepas 7 pagi)</label>' +
        medanHTML(medanKataKunci, t.kataKunci) +
        '<details class="lanjutan"><summary>Tetapan lanjutan</summary>' + medanHTML(medanModel, t.model) + '</details>' +
        '<div class="borang-tindakan"><button type="submit" class="butang butang-emas">Simpan tetapan</button></div>' +
      '</form>' +
      '<div class="nota-ai">' +
        '<p><strong>Cara ia berfungsi:</strong> pembantu AI mencari berita terkini di Google News menggunakan kata kunci di atas. AI kemudian memilih maksimum 3 berita yang relevan untuk sekolah rendah dan menulis ringkasan berdasarkan tajuk berita.</p>' +
        '<p>Semua cadangan disimpan sebagai <strong>Draf</strong> dan tidak dipaparkan kepada orang awam. Guru perlu menyemak dan menekan <strong>Terbit</strong> di Homepage, tab Pengumuman. Sentiasa buka pautan sumber untuk memastikan maklumat tepat sebelum diterbitkan.</p>' +
      '</div>';

    document.getElementById('btnLihatDraf').addEventListener('click', function () { bukaSeksyen('homepage', 'pengumuman'); });

    document.getElementById('btnCariSekarang').addEventListener('click', function (e) {
      denganButang(e.currentTarget, 'Sedang mencari… (sehingga 1 minit)', async function () {
        const j = await panggil('jalankanAI');
        batalCache('Pengumuman');
        toast(j.data.mesej, j.data.ralat ? 'ralat' : '');
        lukisAI(bekas);
        muatTab('Pengumuman').then(kemaskiniLencanaAI).catch(function () {});
      });
    });

    const f = bekas.querySelector('form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      const d = kumpul(f, [medanKunci, medanKataKunci, medanModel]);
      d.aktif = f.elements.aktif.checked;
      if (d.aktif && !t.adaKunci && !d.kunci) {
        toast('Sila tampal kunci API Gemini sebelum mengaktifkan carian automatik.', 'ralat');
        f.elements.kunci.focus();
        return;
      }
      denganButang(f.querySelector('[type="submit"]'), 'Menyimpan…', async function () {
        await panggil('simpanTetapanAI', { data: d });
        toast('Tetapan pembantu AI disimpan.');
        lukisAI(bekas);
      });
    });
  }


  /* ================= TUKAR KATA LALUAN ================= */

  function lukisKataLaluan(bekas) {
    const medan = [
      { n: 'lama', l: 'Kata laluan semasa', jenis: 'password', wajib: true, auto: 'current-password' },
      { n: 'baru', l: 'Kata laluan baharu', jenis: 'password', wajib: true, auto: 'new-password', bantu: 'Sekurang-kurangnya 8 aksara. Gabungkan huruf dan nombor.' },
      { n: 'sahkan', l: 'Taip semula kata laluan baharu', jenis: 'password', wajib: true, auto: 'new-password' }
    ];
    bekas.innerHTML = '<form class="borang-admin borang-sempit" novalidate>' +
      medan.map(function (m) { return medanHTML(m, ''); }).join('') +
      '<div class="borang-tindakan"><button type="submit" class="butang butang-emas">Tukar kata laluan</button></div>' +
    '</form>';

    const f = bekas.querySelector('form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!semakWajib(f, medan)) return;
      const d = kumpul(f, medan);
      if (d.baru.length < 8) return toast('Kata laluan baharu mesti sekurang-kurangnya 8 aksara.', 'ralat');
      if (d.baru !== d.sahkan) return toast('Kata laluan baharu tidak sepadan. Sila taip semula.', 'ralat');
      denganButang(f.querySelector('[type="submit"]'), 'Menukar…', async function () {
        await panggil('tukarKataLaluan', { lama: d.lama, baru: d.baru });
        f.reset();
        toast('Kata laluan berjaya ditukar.');
      });
    });
  }


  /* ================= MULA ================= */

  async function mula() {
    document.body.innerHTML =
      '<div id="skrin"><div class="memuat-penuh" role="status"><span class="pusing"></span>Memuatkan…</div></div>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>';
    ambilNamaSekolah();

    if (TOKEN) {
      try {
        await panggil('semakSesi');
        lukisApp();
        return;
      } catch (e) { /* sesi tamat, paparkan login */ }
    }
    if (!document.getElementById('borangLogin')) lukisLogin();
  }

  mula();
})();
