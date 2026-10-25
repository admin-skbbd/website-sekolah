/**
 * WEBSITE SEKOLAH — Paparan awam
 * Fail ini membina header, menu, kandungan halaman dan footer
 * berdasarkan data dari Google Sheet (melalui Apps Script).
 */
(function () {
  'use strict';

  const API = CONFIG.API_URL;
  const HALAMAN = document.body.dataset.halaman || 'utama';
  const KOLEKSI = {};          // Simpanan item untuk paparan modal
  let fokusTerakhir = null;

  const MENU = [
    { id: 'utama',       label: 'Utama',       href: 'index.html' },
    { id: 'pentadbiran', label: 'Pentadbiran', href: 'pentadbiran.html' },
    { id: 'kurikulum',   label: 'Kurikulum',   href: 'kurikulum.html' },
    { id: 'hem',         label: 'HEM',         href: 'hem.html' },
    { id: 'kokurikulum', label: 'Kokurikulum', href: 'kokurikulum.html' },
    { id: 'aktiviti',    label: 'Aktiviti',    href: 'aktiviti.html' },
    { id: 'pautan',      label: 'Pautan',      href: 'pautan.html' },
    { id: 'aduan',       label: 'Aduan',       href: 'aduan.html' }
  ];

  const INFO_HALAMAN = {
    pentadbiran: { tajuk: 'Pentadbiran', tab: 'Pentadbiran', ket: 'Barisan pentadbir dan pengurusan sekolah.' },
    kurikulum:   { tajuk: 'Kurikulum', tab: 'Kurikulum', ket: 'Program akademik, peperiksaan dan pencapaian murid.' },
    hem:         { tajuk: 'Hal Ehwal Murid', tab: 'HEM', ket: 'Disiplin, kebajikan, kesihatan dan bimbingan murid.' },
    kokurikulum: { tajuk: 'Kokurikulum', tab: 'Kokurikulum', ket: 'Kelab, persatuan, unit beruniform dan sukan.' },
    aktiviti:    { tajuk: 'Aktiviti Sekolah', tab: 'Aktiviti', ket: 'Program dan majlis yang telah dijalankan di sekolah.' },
    pautan:      { tajuk: 'Pautan', tab: 'Pautan', ket: 'Pautan pantas ke laman web rasmi kerajaan dan sistem pendidikan.' },
    aduan:       { tajuk: 'Aduan & Maklum Balas', ket: 'Sampaikan aduan atau cadangan anda kepada pihak sekolah.' }
  };

  const KATEGORI_ADUAN = ['Kemudahan sekolah', 'Disiplin murid', 'Pengajaran dan pembelajaran', 'Keselamatan', 'Cadangan', 'Lain-lain'];


  /* ================= FUNGSI BANTUAN ================= */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function perenggan(s) {
    const t = String(s || '').trim();
    if (!t) return '';
    return esc(t).split(/\n{2,}/).map(function (p) {
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function ringkas(s, n) {
    n = n || 130;
    s = String(s || '').replace(/\s+/g, ' ').trim();
    return s.length > n ? s.slice(0, n).trim() + '…' : s;
  }

  function inisial(nama) {
    return String(nama || '').split(/\s+/).filter(Boolean).slice(0, 3)
      .map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  // Tukar pautan Google Drive kepada pautan gambar yang boleh dipaparkan
  function urlGambar(u) {
    u = String(u || '').trim();
    if (!u) return '';
    if (/drive\.google|docs\.google/.test(u)) {
      const m = u.match(/\/d\/([\w-]{20,})/) || u.match(/[?&]id=([\w-]{20,})/);
      if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
    }
    return /^https:\/\//.test(u) ? u : '';
  }

  // Minta Google hantar gambar dalam saiz yang sesuai (lebih laju)
  function saiz(u, w) {
    if (!u) return '';
    return /^https:\/\/lh3\.googleusercontent\.com\/d\/[\w-]+$/.test(u) ? u + '=w' + w : u;
  }

  function senaraiGambar(s) {
    return String(s || '').split(/[,\n]/).map(urlGambar).filter(Boolean);
  }

  // Tukar pautan YouTube / Google Drive kepada pautan video embed
  function urlVideo(u) {
    u = String(u || '').trim();
    if (!u) return '';
    let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1];
    m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
    return '';
  }

  function formatTarikh(t) {
    if (!t) return '';
    const d = new Date(String(t).replace(' ', 'T'));
    if (isNaN(d)) return esc(t);
    return d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function simpan(tab, item) {
    const kunci = tab + ':' + item.ID;
    KOLEKSI[kunci] = item;
    return kunci;
  }

  function kosong(mesej) {
    return '<div class="kosong"><p>' + esc(mesej) + '</p></div>';
  }


  /* ================= AMBIL DATA ================= */

  // Data disimpan dalam pelayar supaya halaman seterusnya dibuka serta-merta
  const KUNCI_SIMPANAN = 'dataSekolah_v2';

  function bacaSimpanan() {
    try {
      const c = JSON.parse(localStorage.getItem(KUNCI_SIMPANAN) || 'null');
      if (c && c.data) return c;
    } catch (e) { /* abaikan */ }
    return null;
  }

  async function ambilTerkini() {
    const r = await fetch(API + '?action=semua');
    const j = await r.json();
    if (!j.ok) throw new Error(j.mesej || 'Ralat pelayan');
    try { localStorage.setItem(KUNCI_SIMPANAN, JSON.stringify({ masa: Date.now(), data: j.data })); } catch (e) { /* abaikan */ }
    return j.data;
  }


  /* ================= RANGKA HALAMAN ================= */

  function binaRangka() {
    const nav = MENU.map(function (m) {
      return '<li><a href="' + m.href + '"' + (m.id === HALAMAN ? ' aria-current="page"' : '') + '>' + m.label + '</a></li>';
    }).join('');

    document.body.innerHTML =
      '<a class="langkau" href="#kandungan">Langkau ke kandungan</a>' +
      '<header class="kepala">' +
        '<div class="bekas kepala-dalam">' +
          '<a class="jenama" href="index.html">' +
            '<span class="lambang" id="lambang" aria-hidden="true"></span>' +
            '<span class="jenama-teks"><strong id="namaSekolah">Memuatkan…</strong><small id="motoSekolah"></small></span>' +
          '</a>' +
          '<button class="butang-menu" id="butangMenu" aria-expanded="false" aria-controls="nav"><span aria-hidden="true">☰</span> Menu</button>' +
          '<nav class="nav" id="nav" aria-label="Menu utama"><ul>' + nav + '<li class="nav-admin"><a href="admin.html">Log masuk guru</a></li></ul></nav>' +
        '</div>' +
      '</header>' +
      '<div class="ticker" id="ticker" hidden></div>' +
      '<main id="kandungan" tabindex="-1">' +
        '<div class="memuat" role="status"><span class="pusing"></span>Memuatkan maklumat sekolah…</div>' +
      '</main>' +
      '<footer class="kaki" id="kaki"></footer>' +
      '<div class="modal" id="modal" hidden>' +
        '<div class="modal-latar" data-tutup></div>' +
        '<div class="modal-kotak" role="dialog" aria-modal="true" aria-labelledby="modalTajuk">' +
          '<button class="modal-tutup" id="modalTutup" data-tutup aria-label="Tutup">×</button>' +
          '<div class="modal-isi" id="modalIsi"></div>' +
        '</div>' +
      '</div>';

    // Menu mudah alih
    const btn = document.getElementById('butangMenu');
    btn.addEventListener('click', function () {
      const buka = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!buka));
      document.getElementById('nav').classList.toggle('buka', !buka);
    });

    // Klik pada kad / pengumuman untuk buka modal
    document.addEventListener('click', function (e) {
      const el = e.target.closest('[data-item]');
      if (el) { e.preventDefault(); bukaModal(el.dataset.item, el); }
    });

    // Modal: tutup & tukar gambar galeri
    document.getElementById('modal').addEventListener('click', function (e) {
      if (e.target.closest('[data-tutup]')) return tutupModal();
      const g = e.target.closest('[data-gambar]');
      if (g) {
        document.getElementById('galeriUtama').src = g.dataset.gambar;
        document.querySelectorAll('.galeri-kecil button').forEach(function (b) { b.classList.toggle('aktif', b === g); });
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') tutupModal(); });
  }

  function isiKepala(t) {
    const nama = t.nama_sekolah || 'Laman Web Sekolah';
    document.getElementById('namaSekolah').textContent = nama;
    document.getElementById('motoSekolah').textContent = t.moto || '';
    const lambang = document.getElementById('lambang');
    const logo = saiz(urlGambar(t.logo), 160);
    if (logo) lambang.innerHTML = '<img src="' + esc(logo) + '" alt="">';
    else lambang.textContent = inisial(nama);
    const info = INFO_HALAMAN[HALAMAN];
    document.title = (info ? info.tajuk + ' | ' : '') + nama;
  }

  function isiTicker(senarai) {
    const el = document.getElementById('ticker');
    if (!senarai.length) { el.hidden = true; el.innerHTML = ''; return; }
    const pautan = senarai.slice(0, 8).map(function (p) {
      return '<a href="#" data-item="' + esc(simpan('Pengumuman', p)) + '">' + esc(p.Tajuk) + '</a>';
    }).join('<span class="ticker-titik" aria-hidden="true">◆</span>') + '<span class="ticker-titik" aria-hidden="true">◆</span>';

    el.innerHTML =
      '<div class="bekas ticker-dalam">' +
        '<span class="ticker-label">Pengumuman</span>' +
        '<div class="ticker-trek"><div class="ticker-gelung">' +
          '<span class="ticker-set">' + pautan + '</span>' +
          '<span class="ticker-set" aria-hidden="true">' + pautan.replace(/<a /g, '<a tabindex="-1" ') + '</span>' +
        '</div></div>' +
      '</div>';
    el.hidden = false;
  }

  function isiKaki(t) {
    const nama = t.nama_sekolah || 'Laman Web Sekolah';
    let peta = String(t.peta_google || '').trim();
    const src = peta.match(/src="([^"]+)"/);   // jika guru tampal kod iframe penuh
    if (src) peta = src[1];
    const petaEmbed = /^https:\/\/www\.google\.com\/maps\/embed/.test(peta) ? peta : '';
    const fb = /^https:\/\//.test(t.facebook || '') ? t.facebook : '';

    let hubung = '';
    if (t.telefon) hubung += '<li>Tel: <a href="tel:' + esc(String(t.telefon).replace(/[^\d+]/g, '')) + '">' + esc(t.telefon) + '</a></li>';
    if (t.emel) hubung += '<li>Emel: <a href="mailto:' + esc(t.emel) + '">' + esc(t.emel) + '</a></li>';
    if (fb) hubung += '<li><a href="' + esc(fb) + '" target="_blank" rel="noopener">Facebook rasmi sekolah</a></li>';

    let blokPeta = '';
    if (petaEmbed) {
      blokPeta = '<div class="kaki-peta"><iframe src="' + esc(petaEmbed) + '" title="Peta lokasi sekolah" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>';
    } else if (/^https:\/\//.test(peta)) {
      blokPeta = '<div><a class="butang butang-garis" href="' + esc(peta) + '" target="_blank" rel="noopener">Lihat lokasi di Google Maps</a></div>';
    }

    document.getElementById('kaki').innerHTML =
      '<div class="bekas kaki-grid">' +
        '<div>' +
          '<strong class="kaki-nama">' + esc(nama) + '</strong>' +
          (t.alamat ? '<p>' + esc(t.alamat).replace(/\n/g, '<br>') + '</p>' : '') +
          (hubung ? '<ul class="kaki-hubung">' + hubung + '</ul>' : '') +
        '</div>' +
        '<div>' +
          '<strong class="kaki-tajuk">Pautan</strong>' +
          '<ul>' + MENU.map(function (m) { return '<li><a href="' + m.href + '">' + m.label + '</a></li>'; }).join('') + '<li><a href="admin.html">Log masuk guru</a></li></ul>' +
        '</div>' +
        blokPeta +
      '</div>' +
      '<div class="kaki-bawah"><div class="bekas">© ' + new Date().getFullYear() + ' ' + esc(nama) + '. Hak cipta terpelihara.</div></div>';
  }


  /* ================= KOMPONEN ================= */

  function kad(tab, x) {
    const kunci = simpan(tab, x);
    const g = saiz(senaraiGambar(x.Gambar)[0], 640);
    const adaVideo = !!urlVideo(x.Video);
    return '<a class="kad" href="#" data-item="' + esc(kunci) + '" data-kategori="' + esc(x.Kategori || '') + '">' +
      '<div class="kad-gambar">' +
        (g ? '<img src="' + esc(g) + '" alt="" loading="lazy">' : '<span class="kad-tiada">' + esc(inisial(x.Tajuk)) + '</span>') +
        (adaVideo ? '<span class="lencana-video">▶ Video</span>' : '') +
      '</div>' +
      '<div class="kad-isi">' +
        (x.Kategori ? '<span class="kad-kategori">' + esc(x.Kategori) + '</span>' : '') +
        '<h3>' + esc(x.Tajuk) + '</h3>' +
        '<p>' + esc(ringkas(x.Kandungan)) + '</p>' +
        (x.Tarikh ? '<time>' + formatTarikh(x.Tarikh) + '</time>' : '') +
      '</div>' +
    '</a>';
  }

  function pita(info) {
    return '<section class="pita"><div class="bekas"><h1>' + esc(info.tajuk) + '</h1><p>' + esc(info.ket) + '</p></div></section>';
  }


  /* ================= HALAMAN ================= */

  function halamanUtama(d) {
    const t = d.Tetapan || {};
    const gb = saiz(urlGambar(t.gambar_guru_besar), 600);
    const misi = String(t.misi || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    const pengumuman = (d.Pengumuman || []).slice(0, 5);
    const aktiviti = (d.Aktiviti || []).slice(0, 3);

    const senaraiPengumuman = pengumuman.length
      ? '<ul class="senarai-pengumuman">' + pengumuman.map(function (p) {
          return '<li><a href="#" data-item="' + esc(simpan('Pengumuman', p)) + '">' +
            '<time>' + formatTarikh(p.Tarikh) + '</time><span>' + esc(p.Tajuk) + '</span></a></li>';
        }).join('') + '</ul>'
      : kosong('Tiada pengumuman buat masa ini.');

    return '' +
      '<section class="hero" id="hero">' +
        '<div class="bekas hero-bingkai">' +
          '<p class="hero-sambut">Selamat datang ke laman web rasmi</p>' +
          '<h1>' + esc(t.nama_sekolah || 'Sekolah Kami') + '</h1>' +
          (t.moto ? '<p class="hero-moto">“' + esc(t.moto) + '”</p>' : '') +
          '<div class="hero-tindakan">' +
            '<a class="butang butang-emas" href="aktiviti.html">Lihat aktiviti sekolah</a>' +
            '<a class="butang butang-garis" href="aduan.html">Hantar aduan</a>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="seksyen seksyen-putih"><div class="bekas aluan">' +
        '<figure class="aluan-foto">' +
          (gb ? '<img src="' + esc(gb) + '" alt="' + esc(t.nama_guru_besar || 'Guru Besar') + '">'
              : '<div class="foto-kosong">' + esc(inisial(t.nama_guru_besar || 'Guru Besar')) + '</div>') +
          '<figcaption><strong>' + esc(t.nama_guru_besar || 'Guru Besar') + '</strong><span>Guru Besar</span></figcaption>' +
        '</figure>' +
        '<div class="aluan-teks"><h2>Kata alu-aluan</h2>' + perenggan(t.kata_aluan) + '</div>' +
      '</div></section>' +

      '<section class="seksyen seksyen-biru"><div class="bekas visi-misi">' +
        '<div><h2>Visi</h2><p class="visi">' + esc(t.visi || '') + '</p></div>' +
        '<div><h2>Misi</h2>' + (misi.length > 1
          ? '<ul class="senarai-misi">' + misi.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>'
          : perenggan(t.misi)) + '</div>' +
      '</div></section>' +

      '<section class="seksyen"><div class="bekas">' +
        '<div class="tajuk-seksyen"><h2>Pengumuman terkini</h2></div>' +
        senaraiPengumuman +
      '</div></section>' +

      '<section class="seksyen seksyen-kelabu"><div class="bekas">' +
        '<div class="tajuk-seksyen"><h2>Aktiviti terkini</h2><a class="pautan" href="aktiviti.html">Semua aktiviti</a></div>' +
        (aktiviti.length
          ? '<div class="grid-kad">' + aktiviti.map(function (a) { return kad('Aktiviti', a); }).join('') + '</div>'
          : kosong('Belum ada aktiviti dikongsi.')) +
      '</div></section>';
  }

  function halamanKandungan(d, info) {
    const senarai = d[info.tab] || [];
    const kategori = senarai.map(function (x) { return x.Kategori; })
      .filter(function (k, i, arr) { return k && arr.indexOf(k) === i; });

    const penapis = kategori.length > 1
      ? '<div class="penapis" role="group" aria-label="Tapis mengikut kategori">' +
          '<button class="cip aktif" data-kategori="" aria-pressed="true">Semua</button>' +
          kategori.map(function (k) { return '<button class="cip" data-kategori="' + esc(k) + '" aria-pressed="false">' + esc(k) + '</button>'; }).join('') +
        '</div>'
      : '';

    return pita(info) +
      '<section class="seksyen"><div class="bekas">' + penapis +
        (senarai.length
          ? '<div class="grid-kad">' + senarai.map(function (x) { return kad(info.tab, x); }).join('') + '</div>'
          : kosong('Belum ada maklumat dalam bahagian ini. Maklumat akan dipaparkan sebaik sahaja guru mengemaskininya.')) +
      '</div></section>';
  }

  function halamanPentadbiran(d, info) {
    const s = (d.Pentadbiran || []).slice().sort(function (a, b) {
      return (Number(a.Susunan) || 999) - (Number(b.Susunan) || 999);
    });
    const grid = s.map(function (o, i) {
      const g = saiz(urlGambar(o.Gambar), 440);
      return '<figure class="orang' + (i === 0 ? ' orang-utama' : '') + '">' +
        '<div class="orang-foto">' + (g ? '<img src="' + esc(g) + '" alt="' + esc(o.Nama) + '" loading="lazy">' : '<span>' + esc(inisial(o.Nama)) + '</span>') + '</div>' +
        '<figcaption><strong>' + esc(o.Nama) + '</strong><span>' + esc(o.Jawatan) + '</span></figcaption>' +
      '</figure>';
    }).join('');

    return pita(info) +
      '<section class="seksyen"><div class="bekas">' +
        (s.length ? '<div class="grid-orang">' + grid + '</div>' : kosong('Senarai pentadbir belum dikemaskini.')) +
      '</div></section>';
  }

  function domain(u) {
    try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function kadPautan(p) {
    const dom = domain(p.URL);
    const logo = saiz(urlGambar(p.Logo), 128) || ('https://www.google.com/s2/favicons?sz=64&domain=' + encodeURIComponent(dom));
    return '<a class="pautan-kad" href="' + esc(p.URL) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="pautan-logo"><img src="' + esc(logo) + '" alt="" loading="lazy"></span>' +
      '<span class="pautan-teks">' +
        '<strong>' + esc(p.Nama) + '</strong>' +
        (p.Keterangan ? '<span class="pautan-ket">' + esc(p.Keterangan) + '</span>' : '') +
        '<span class="pautan-domain">' + esc(dom) + '</span>' +
      '</span>' +
      '<span class="sr-only"> (dibuka di tab baharu)</span>' +
    '</a>';
  }

  function halamanPautan(d, info) {
    const s = (d.Pautan || [])
      .filter(function (p) { return /^https?:\/\//.test(p.URL || ''); })
      .sort(function (a, b) { return (Number(a.Susunan) || 999) - (Number(b.Susunan) || 999); });
    if (!s.length) {
      return pita(info) + '<section class="seksyen"><div class="bekas">' + kosong('Senarai pautan belum dikemaskini.') + '</div></section>';
    }
    // Kumpulkan ikut kategori
    const kumpulan = {};
    const urutan = [];
    s.forEach(function (p) {
      const k = p.Kategori || 'Pautan lain';
      if (!kumpulan[k]) { kumpulan[k] = []; urutan.push(k); }
      kumpulan[k].push(p);
    });
    return pita(info) + '<section class="seksyen"><div class="bekas">' +
      urutan.map(function (k) {
        return '<div class="kumpulan-pautan">' +
          (urutan.length > 1 ? '<div class="tajuk-seksyen"><h2>' + esc(k) + '</h2></div>' : '') +
          '<div class="grid-pautan">' + kumpulan[k].map(kadPautan).join('') + '</div>' +
        '</div>';
      }).join('') +
    '</div></section>';
  }

  function halamanAduan(info) {
    return pita(info) +
      '<section class="seksyen"><div class="bekas bekas-sempit">' +
        '<form class="borang" id="borangAduan" novalidate>' +
          '<div class="medan"><label for="fNama">Nama penuh <span class="wajib">*</span></label>' +
            '<input id="fNama" name="Nama" required maxlength="100" autocomplete="name"></div>' +
          '<div class="baris-dua">' +
            '<div class="medan"><label for="fEmel">Emel</label><input type="email" id="fEmel" name="Emel" maxlength="100" autocomplete="email"></div>' +
            '<div class="medan"><label for="fTel">No. telefon</label><input type="tel" id="fTel" name="Telefon" maxlength="20" autocomplete="tel"></div>' +
          '</div>' +
          '<div class="medan"><label for="fKat">Kategori</label><select id="fKat" name="Kategori">' +
            KATEGORI_ADUAN.map(function (k) { return '<option>' + k + '</option>'; }).join('') +
          '</select></div>' +
          '<div class="medan"><label for="fAduan">Aduan atau maklum balas <span class="wajib">*</span></label>' +
            '<textarea id="fAduan" name="Aduan" rows="6" required maxlength="3000"></textarea></div>' +
          '<div class="medan-perangkap" aria-hidden="true"><label>Laman web <input name="laman" tabindex="-1" autocomplete="off"></label></div>' +
          '<p class="nota">Maklumat peribadi anda hanya digunakan oleh pihak sekolah untuk tindakan susulan.</p>' +
          '<button class="butang butang-emas" type="submit">Hantar aduan</button>' +
          '<div class="mesej-borang" id="mesejBorang" role="status" aria-live="polite"></div>' +
        '</form>' +
      '</div></section>';
  }


  /* ================= INTERAKSI ================= */

  function pasangPenapis() {
    document.querySelectorAll('.cip').forEach(function (cip) {
      cip.addEventListener('click', function () {
        const k = cip.dataset.kategori;
        document.querySelectorAll('.cip').forEach(function (c) {
          c.classList.toggle('aktif', c === cip);
          c.setAttribute('aria-pressed', String(c === cip));
        });
        document.querySelectorAll('.grid-kad .kad').forEach(function (kd) {
          kd.hidden = !!k && kd.dataset.kategori !== k;
        });
      });
    });
  }

  function paparMesej(el, jenis, teks) {
    el.className = 'mesej-borang ' + jenis;
    el.textContent = teks;
  }

  function pasangBorangAduan() {
    const f = document.getElementById('borangAduan');
    if (!f) return;
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      const m = document.getElementById('mesejBorang');
      const data = Object.fromEntries(new FormData(f));
      if (!data.Nama.trim() || !data.Aduan.trim()) {
        paparMesej(m, 'ralat', 'Sila isi nama dan aduan anda.');
        return;
      }
      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Menghantar…';
      try {
        const r = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'hantarAduan', data: data }) });
        const j = await r.json();
        if (!j.ok) throw new Error(j.mesej);
        f.reset();
        paparMesej(m, 'berjaya', j.mesej);
      } catch (err) {
        paparMesej(m, 'ralat', err.message || 'Aduan tidak dapat dihantar. Semak sambungan internet dan cuba lagi.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Hantar aduan';
      }
    });
  }

  function bukaModal(kunci, asal) {
    const x = KOLEKSI[kunci];
    if (!x) return;
    fokusTerakhir = asal || document.activeElement;
    const gambar = senaraiGambar(x.Gambar);
    const video = urlVideo(x.Video);

    let galeri = '';
    if (gambar.length) {
      galeri = '<div class="galeri"><img class="galeri-utama" id="galeriUtama" src="' + esc(saiz(gambar[0], 1600)) + '" alt="">';
      if (gambar.length > 1) {
        galeri += '<div class="galeri-kecil">' + gambar.map(function (g, i) {
          return '<button type="button" data-gambar="' + esc(saiz(g, 1600)) + '"' + (i === 0 ? ' class="aktif"' : '') + ' aria-label="Gambar ' + (i + 1) + '"><img src="' + esc(saiz(g, 200)) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>';
      }
      galeri += '</div>';
    }

    document.getElementById('modalIsi').innerHTML = galeri +
      '<div class="modal-teks">' +
        '<div class="modal-meta">' +
          (x.Kategori ? '<span class="kad-kategori">' + esc(x.Kategori) + '</span>' : '') +
          (x.Tarikh ? '<time>' + formatTarikh(x.Tarikh) + '</time>' : '') +
        '</div>' +
        '<h2 id="modalTajuk">' + esc(x.Tajuk) + '</h2>' +
        (video ? '<div class="video"><iframe src="' + esc(video) + '" title="Video: ' + esc(x.Tajuk) + '" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>' : '') +
        '<div class="modal-kandungan">' + perenggan(x.Kandungan) + '</div>' +
      '</div>';

    document.getElementById('modal').hidden = false;
    document.body.classList.add('modal-buka');
    document.getElementById('modalTutup').focus();
  }

  function tutupModal() {
    const modal = document.getElementById('modal');
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.getElementById('modalIsi').innerHTML = ''; // hentikan video
    document.body.classList.remove('modal-buka');
    if (fokusTerakhir) fokusTerakhir.focus();
  }


  /* ================= MULA ================= */

  function paparSemua(d, kemaskiniLatar) {
    const t = d.Tetapan || {};
    const info = INFO_HALAMAN[HALAMAN];
    isiKepala(t);
    isiKaki(t);
    isiTicker(d.Pengumuman || []);

    // Jangan ganggu pelawat yang sedang membaca modal atau mengisi borang
    const modal = document.getElementById('modal');
    if (kemaskiniLatar && ((modal && !modal.hidden) || HALAMAN === 'aduan')) return;

    const main = document.getElementById('kandungan');
    if (HALAMAN === 'utama') main.innerHTML = halamanUtama(d);
    else if (HALAMAN === 'pentadbiran') main.innerHTML = halamanPentadbiran(d, info);
    else if (HALAMAN === 'aduan') main.innerHTML = halamanAduan(info);
    else if (HALAMAN === 'pautan') main.innerHTML = halamanPautan(d, info);
    else main.innerHTML = halamanKandungan(d, info);

    const banner = saiz(urlGambar(t.banner), 1920);
    const hero = document.getElementById('hero');
    if (banner && hero) {
      hero.classList.add('ada-banner');
      hero.style.setProperty('--banner', 'url("' + banner.replace(/"/g, '%22') + '")');
    }
    pasangPenapis();
    pasangBorangAduan();
  }

  async function mula() {
    binaRangka();
    const simpanan = bacaSimpanan();

    // Ada data tersimpan: papar serta-merta, kemudian semak data terkini di latar belakang
    if (simpanan) {
      paparSemua(simpanan.data, false);
      if (Date.now() - simpanan.masa < (CONFIG.CACHE_MINIT || 1) * 60000) return;
      try {
        const d = await ambilTerkini();
        if (JSON.stringify(d) !== JSON.stringify(simpanan.data)) paparSemua(d, true);
      } catch (e) { /* kekal dengan data tersimpan */ }
      return;
    }

    // Lawatan pertama: tunggu data dari pelayan
    try {
      paparSemua(await ambilTerkini(), false);
    } catch (err) {
      console.error(err);
      const main = document.getElementById('kandungan');
      document.getElementById('namaSekolah').textContent = 'Laman Web Sekolah';
      if (HALAMAN === 'aduan') {
        main.innerHTML = halamanAduan(INFO_HALAMAN.aduan);
        pasangBorangAduan();
        return;
      }
      main.innerHTML =
        '<div class="bekas ralat-muat">' +
          '<h1>Maklumat tidak dapat dimuatkan</h1>' +
          '<p>Semak sambungan internet anda, kemudian cuba lagi.</p>' +
          '<button class="butang butang-emas" id="cubaLagi">Cuba lagi</button>' +
        '</div>';
      document.getElementById('cubaLagi').addEventListener('click', function () { location.reload(); });
    }
  }

  mula();
})();
