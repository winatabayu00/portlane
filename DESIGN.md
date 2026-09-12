# Design System — Dark Finance Dashboard (referensi: FlowBoard)

Dokumentasi lengkap aturan desain untuk membangun dashboard finance bertema gelap. Mencakup token dasar, komponen, aturan teknis, hingga siap pakai dalam Tailwind config.

---

## 1. Prinsip Umum

- **Tema**: Dark mode sebagai basis utama, bukan sekadar opsi toggle.
- **Aksen tunggal**: Satu warna aksen (oranye) untuk semua elemen aktif, CTA, dan highlight data.
- **Semantik warna konsisten**: Hijau = positif/income, Merah = negatif/expense — tidak dipakai untuk elemen lain.
- **Card-based, tanpa border tegas**: Pemisahan antar elemen memakai perbedaan level kontras background, bukan garis.
- **Density tinggi tapi terstruktur**: Banyak data ditampilkan sekaligus, dirapikan lewat grid & hierarki tipografi.
- **Konsistensi radius & spacing**: Semua elemen sejenis (card, button, input) memakai skala radius/spacing yang sama.

---

## 2. Design Tokens — Warna

### 2.1 Background & Surface (elevation layers)
| Token | Hex | Level | Penggunaan |
|---|---|---|---|
| `--bg-base` | `#0B0D10` | 0 | Latar utama aplikasi |
| `--bg-sidebar` | `#0F1114` | 0 | Sidebar |
| `--bg-card` | `#16181C` | 1 | Card/panel utama |
| `--bg-card-alt` | `#1C1F24` | 2 | Elemen di dalam card (list item, input, nested card) |
| `--bg-card-hover` | `#22252B` | 2 | State hover pada card/list item |
| `--bg-overlay` | `#000000B3` | — | Backdrop modal (70% opacity) |
| `--bg-modal` | `#1A1D22` | 3 | Panel modal/dropdown/tooltip |
| `--border-subtle` | `#2A2D33` | — | Garis pemisah sangat tipis (dipakai minim) |
| `--border-focus` | `#FF6A00` | — | Border saat elemen fokus (input, dsb.) |

> **Aturan elevation**: Semakin "dekat ke user" (modal, tooltip, dropdown) semakin terang backgroundnya. Urutan: base (0) → card (1) → card-alt (2) → modal/dropdown (3).

### 2.2 Warna Aksen
| Token | Hex | Penggunaan |
|---|---|---|
| `--accent-primary` | `#FF6A00` | Menu aktif, tombol utama, grafik utama |
| `--accent-primary-hover` | `#FF7F1F` | Hover pada elemen aksen |
| `--accent-primary-active` | `#E05F00` | Pressed state |
| `--accent-primary-soft` | `#FF6A0022` | Background icon/badge opacity rendah (±13%) |
| `--accent-gradient-start` | `#FF6A00` | Awal gradient banner |
| `--accent-gradient-end` | `#B23F00` | Akhir gradient banner |

### 2.3 Warna Semantik
| Token | Hex | Soft variant (bg icon) | Penggunaan |
|---|---|---|---|
| `--success` | `#22C55E` | `#22C55E1F` | Income, kenaikan %, chart positif |
| `--danger` | `#EF4444` | `#EF44441F` | Expense, penurunan % |
| `--warning` | `#F5A623` | `#F5A6231F` | Status pending/menunggu |
| `--info` | `#3B82F6` | `#3B82F61F` | Notifikasi informatif, link sekunder |

### 2.4 Tipografi Warna
| Token | Hex | Penggunaan |
|---|---|---|
| `--text-primary` | `#FFFFFF` | Judul, angka utama |
| `--text-secondary` | `#9CA3AF` | Label, deskripsi |
| `--text-muted` | `#6B7280` | Placeholder, caption, timestamp |
| `--text-disabled` | `#4B5563` | Teks pada elemen disabled |
| `--text-on-accent` | `#FFFFFF` | Teks di atas background aksen solid |

---

## 3. Tipografi

- **Font family**: Sans-serif geometris — `Inter`, `Plus Jakarta Sans`, atau `General Sans`.
- **Font stack fallback**: `'Inter', -apple-system, 'Segoe UI', sans-serif`

### Skala Tipografi
| Nama Token | Ukuran | Line-height | Weight | Contoh Pemakaian |
|---|---|---|---|---|
| `text-display` | 28px | 1.2 | 700 | Angka utama besar (Total Balance) |
| `text-h1` | 22px | 1.3 | 600 | Judul halaman ("Good morning...") |
| `text-h2` | 16px | 1.4 | 600 | Judul card |
| `text-body-lg` | 14px | 1.5 | 500 | Nama transaksi, label penting |
| `text-body` | 13px | 1.5 | 400 | Body/label default |
| `text-caption` | 12px | 1.4 | 400 | Timestamp, status, footnote |
| `text-micro` | 11px | 1.3 | 500 | Badge kecil, tag |

- **Letter-spacing**: Label section sidebar (mis. "MAIN MENU") pakai `+0.05em`, uppercase.
- **Tabular numbers**: Semua angka nominal & persentase memakai `font-variant-numeric: tabular-nums` agar rata saat berubah.

---

## 4. Spacing, Grid & Radius

### 4.1 Spacing Scale (basis 4px)
```
2xs: 4px   xs: 8px   sm: 12px   md: 16px   lg: 20px   xl: 24px   2xl: 32px   3xl: 40px   4xl: 48px
```

### 4.2 Radius Scale
| Token | Nilai | Penggunaan |
|---|---|---|
| `radius-sm` | 8px | Button, input, badge kotak |
| `radius-md` | 12px | Card kecil, dropdown, tooltip |
| `radius-lg` | 16px | Card standar |
| `radius-xl` | 20px | Card besar/hero, banner |
| `radius-full` | 999px | Pill, avatar, status dot |

### 4.3 Layout Grid
- **Struktur**: Sidebar fixed (220–260px) + Main content (fluid, max-width ±1440px, padding 24–32px).
- **Grid statistik atas**: `grid-template-columns: repeat(4, 1fr)`, gap 20px. Breakpoint md: 2 kolom, sm: 1 kolom.
- **Grid tengah**: Rasio 60/40 (`2fr 1fr`) untuk grafik utama vs breakdown. Breakpoint md: stack vertikal.
- **Grid bawah**: `repeat(3, 1fr)`, gap 20px. Breakpoint md: stack vertikal.
- **Container padding**: 24px (desktop), 16px (tablet), 12px (mobile).

### 4.4 Breakpoints
| Nama | Lebar | Perilaku |
|---|---|---|
| `sm` | < 640px | Sidebar collapse jadi drawer/bottom nav, semua grid jadi 1 kolom |
| `md` | 640–1024px | Sidebar bisa collapse ke icon-only, grid 2 kolom |
| `lg` | 1024–1440px | Layout penuh 3-4 kolom |
| `xl` | > 1440px | Max-width container terkunci, konten center |

---

## 5. Elevation & Shadow

Dark mode tidak memakai drop-shadow gelap konvensional (tidak terlihat). Gunakan kombinasi **brightness border** + **shadow tipis dengan opacity rendah**.

| Level | Shadow | Penggunaan |
|---|---|---|
| `shadow-none` | none | Card default di atas background base |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Hover state card |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Dropdown, tooltip |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.6)` | Modal |
| `shadow-accent` | `0 4px 14px rgba(255,106,0,0.35)` | Button primary hover (glow oranye tipis) |

---

## 6. Komponen

### 6.1 Sidebar
- Logo + nama produk + tagline kecil di atas.
- Search bar dengan shortcut key (⌘K) rata kanan, background `--bg-card-alt`, radius `sm`.
- Label section uppercase, `--text-muted`, letter-spacing lebar, margin-top 24px sebelum grup baru.
- Item menu aktif: background `--accent-primary` solid, teks putih, radius `sm`, icon kiri.
- Item menu non-aktif: teks `--text-secondary`, hover → background `--bg-card-alt`.
- Card promosi menempel di bawah menu, background gradient soft, CTA button solid.
- Profil user paling bawah: avatar bulat, nama + email dua baris, chevron kanan (trigger dropdown akun).

### 6.2 Stat Card
- Header: label kiri (`text-body`) + icon bulat kanan (background soft warna semantik).
- Angka besar (`text-display`) di bawah label.
- Indikator persentase: icon panah kecil + warna semantik + teks `text-caption`.
- Sparkline tipis di bagian bawah, tanpa axis/grid, stroke 2px.
- Padding internal: 20px semua sisi.

### 6.3 Card Grafik
- Header: judul (`text-h2`) kiri + dropdown filter pill kanan.
- Dropdown filter: border `--border-subtle` 1px, radius `full` atau `sm`, padding 6px 12px, chevron icon kanan.
- Angka ringkasan besar + indikator perubahan di bawah header.
- Bar chart: warna solid aksen, satu bar highlight dengan tooltip melayang saat data point terpilih/hover.
- Tooltip chart: background `--bg-modal`, shadow `shadow-md`, radius `md`, muncul dengan sedikit offset di atas titik data.

### 6.4 Donut/Pie Chart
- Legenda di kanan (bukan bawah): dot warna + label + nominal + persentase dalam satu baris, rata kiri-kanan.
- Semua warna dalam satu keluarga hue (monokromatik aksen) untuk membedakan kategori tanpa kontras mencolok.
- Total value di tengah donut, `text-h1` + label kecil di bawahnya.
- Ketebalan ring: ±35–40% dari radius total (donut, bukan pie penuh).

### 6.5 List Item (Transaksi/Aktivitas)
- Icon merchant kiri: bulat 40px, background brand/netral.
- Nama + timestamp: dua baris kiri (`text-body-lg` + `text-caption`).
- Nominal kanan atas (`text-body-lg`, warna semantik +/-), status badge kanan bawah (`text-micro`, pill, `--text-muted`).
- Divider antar item: tanpa border, cukup padding vertikal 12–16px dan hover background `--bg-card-hover`.
- Header list: judul kiri + link "View All" kanan (`--accent-primary`, `text-caption`, weight 600).

### 6.6 Progress/Goals Item
- Icon kategori kiri (background soft sesuai kategori, tidak selalu aksen utama).
- Label + nilai "current / target" kanan atas, rata kanan.
- Progress bar: height 6–8px, radius `full`, track `--bg-card-alt`, fill warna icon kategori.
- Animasi fill: transisi width 400ms ease-out saat data berubah.

### 6.7 Banner/Insight
- Full-width, gradient `--accent-gradient-start` → `--accent-gradient-end`, radius `xl`.
- Icon tema kiri, teks insight tengah (`text-body-lg`, putih), CTA button solid putih/kontras kanan.
- Elemen dekoratif (ilustrasi grafik/partikel) opacity rendah di belakang teks, tidak mengganggu keterbacaan.
- Caption kecil pojok kanan bawah (mis. "Generated on...").

### 6.8 Button
| Varian | Background | Teks | Border | Penggunaan |
|---|---|---|---|---|
| Primary | `--accent-primary` solid | putih | none | CTA utama |
| Secondary | `--bg-card-alt` | putih | 1px `--border-subtle` | Aksi sekunder |
| Ghost | transparan | `--text-secondary` | none | Aksi tersier, cancel |
| Danger | `--danger` solid | putih | none | Aksi destruktif |
| Icon button | `--bg-card-alt` | icon putih | none | Notifikasi, kalender, aksi ikon-only |

- Padding: `10px 16px` (default), `8px 12px` (small), `12px 20px` (large).
- Radius: `sm` (8px) untuk semua button kecuali icon-button (`full` jika bulat).
- Disabled state: opacity 40%, cursor not-allowed, tanpa hover effect.

### 6.9 Form & Input
- Input field: background `--bg-card-alt`, border 1px transparan, radius `sm`, padding `10px 14px`.
- Focus state: border berubah jadi `--border-focus` (2px), tanpa outline browser default.
- Placeholder: `--text-muted`.
- Label di atas input: `text-caption`, `--text-secondary`, margin-bottom 6px.
- Error state: border `--danger`, helper text merah di bawah input (`text-caption`).
- Checkbox/Radio: custom styled, radius `4px` (checkbox)/`full` (radio), checked state background `--accent-primary`.
- Toggle switch: track `--bg-card-alt` (off) / `--accent-primary` (on), thumb putih, radius `full`.
- Select/Dropdown: sama seperti input, dengan chevron icon kanan, opsi muncul sebagai panel `--bg-modal` + shadow `md`.

### 6.10 Table
- Header row: `text-caption` uppercase, `--text-muted`, tanpa background berbeda (atau `--bg-card-alt` tipis).
- Row: padding vertikal 14–16px, hover → `--bg-card-hover`.
- Tanpa vertical border antar kolom; horizontal divider (jika perlu) pakai `--border-subtle` 1px opacity rendah.
- Kolom angka: rata kanan, tabular-nums.
- Kolom aksi: icon button ghost di ujung kanan, muncul saat row di-hover (opsional).
- Pagination di footer: nomor halaman pill, aktif = `--accent-primary` solid.

### 6.11 Modal / Dialog
- Overlay: `--bg-overlay` (70% hitam), klik di luar modal untuk menutup.
- Panel: `--bg-modal`, radius `xl`, shadow `lg`, max-width 480–560px (standar), padding 24px.
- Header: judul (`text-h2`) + close icon button kanan.
- Footer: button rata kanan, ghost/secondary di kiri, primary di kanan.
- Animasi masuk: fade + scale dari 0.95 → 1, 200ms ease-out.

### 6.12 Tabs
- Underline style: teks `--text-secondary`, tab aktif → `--text-primary` + underline 2px `--accent-primary`.
- Alternatif pill style: tab aktif = background `--accent-primary`, tab non-aktif transparan.
- Transisi underline/pill: 200ms ease.

### 6.13 Tooltip
- Background `--bg-modal`, teks putih `text-caption`, radius `md`, padding `6px 10px`, shadow `sm`.
- Arrow kecil (4–6px) mengarah ke elemen trigger.
- Delay muncul: 150–200ms setelah hover.

### 6.14 Alert / Toast Notification
| Tipe | Background | Icon | Border kiri |
|---|---|---|---|
| Success | `--success` soft | check | `--success` 3px |
| Error | `--danger` soft | x-circle | `--danger` 3px |
| Warning | `--warning` soft | alert-triangle | `--warning` 3px |
| Info | `--info` soft | info | `--info` 3px |

- Posisi toast: top-right, stack vertikal, auto-dismiss 4–5 detik, radius `md`.

### 6.15 Avatar & Badge
- Avatar: bulat, ukuran standar 32px (list)/40px (profile sidebar)/48px (header profil besar).
- Badge notifikasi (dot count): posisi absolute top-right avatar/icon, background `--danger`, teks putih `text-micro`, min-width 18px, radius `full`.
- Status dot (online/completed): 8px, radius `full`, warna semantik solid tanpa background soft.

---

## 7. Ikonografi

- Style: outline/line-icon, stroke width 1.5–2px, ukuran konsisten 18–20px (kecuali icon besar di banner ±24px).
- Icon dalam badge lingkaran: background soft warna semantik terkait konteks datanya.
- Sumber ikon disarankan: Lucide, Phosphor, atau Feather (konsisten satu sumber saja per project).

---

## 8. Motion & Animasi

| Elemen | Durasi | Easing | Catatan |
|---|---|---|---|
| Hover background | 150ms | ease-out | Card, list item, button |
| Progress bar fill | 400ms | ease-out | Saat data berubah |
| Modal/dropdown masuk | 200ms | ease-out | Fade + scale/slide kecil |
| Chart tooltip muncul | 150ms | ease-out | Fade + translateY kecil |
| Toast masuk/keluar | 250ms | ease-in-out | Slide dari kanan |
| Sidebar collapse | 250ms | ease-in-out | Width transition |

- Hindari animasi > 400ms untuk interaksi UI (biar terasa responsif).
- Gunakan `prefers-reduced-motion` untuk menonaktifkan animasi non-esensial bagi user yang butuh.

---

## 9. State & Interaksi

- **Default → Hover → Active/Pressed → Focus → Disabled**: setiap komponen interaktif harus mendefinisikan kelima state ini secara eksplisit.
- **Hover**: brightness/background naik satu level elevation, tanpa shadow gelap.
- **Focus (keyboard nav)**: ring 2px `--accent-primary` dengan offset 2px, wajib terlihat jelas (jangan `outline: none` tanpa pengganti).
- **Active/Selected**: background aksen solid (menu sidebar, tab, titik data chart terpilih).
- **Disabled**: opacity 40%, tidak ada hover/active effect, cursor `not-allowed`.
- **Loading/Skeleton**: block dengan `--bg-card-alt`, animasi shimmer/pulse halus (1.5s loop), radius mengikuti elemen aslinya.
- **Empty state**: ilustrasi/icon muted di tengah, teks `--text-secondary`, CTA opsional untuk aksi lanjutan.

---

## 10. Accessibility

- Kontras teks minimal: `--text-primary` di atas `--bg-card` harus memenuhi WCAG AA (≥4.5:1) — putih di atas gelap ini umumnya aman.
- Jangan mengandalkan warna saja untuk makna (mis. naik/turun): selalu sertai icon panah/tanda +/- di samping warna.
- Semua elemen interaktif harus reachable via keyboard (tab order logis) dan punya focus state terlihat.
- Icon-only button wajib punya `aria-label`.
- Ukuran target sentuh minimal 40x40px untuk elemen mobile.

---

## 11. Z-index Scale

| Layer | z-index | Elemen |
|---|---|---|
| Base | 0 | Konten normal |
| Sticky header | 10 | Top bar, sidebar sticky |
| Dropdown | 20 | Filter dropdown, select menu |
| Tooltip | 30 | Tooltip chart/hover |
| Modal overlay | 40 | Backdrop modal |
| Modal content | 41 | Panel modal |
| Toast | 50 | Notifikasi toast (selalu paling atas) |

---

## 12. Tailwind Config (siap pakai)

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: '#0B0D10',
        sidebar: '#0F1114',
        card: '#16181C',
        'card-alt': '#1C1F24',
        'card-hover': '#22252B',
        modal: '#1A1D22',
        border: {
          subtle: '#2A2D33',
          focus: '#FF6A00',
        },
        accent: {
          DEFAULT: '#FF6A00',
          hover: '#FF7F1F',
          active: '#E05F00',
          soft: 'rgba(255,106,0,0.13)',
        },
        success: { DEFAULT: '#22C55E', soft: 'rgba(34,197,94,0.12)' },
        danger:  { DEFAULT: '#EF4444', soft: 'rgba(239,68,68,0.12)' },
        warning: { DEFAULT: '#F5A623', soft: 'rgba(245,166,35,0.12)' },
        info:    { DEFAULT: '#3B82F6', soft: 'rgba(59,130,246,0.12)' },
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#6B7280',
          disabled: '#4B5563',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      spacing: {
        '2xs': '4px', xs: '8px', sm: '12px', md: '16px',
        lg: '20px', xl: '24px', '2xl': '32px', '3xl': '40px', '4xl': '48px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.4)',
        md: '0 4px 12px rgba(0,0,0,0.5)',
        lg: '0 8px 24px rgba(0,0,0,0.6)',
        accent: '0 4px 14px rgba(255,106,0,0.35)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        h2: ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['14px', { lineHeight: '1.5', fontWeight: '500' }],
        body: ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        micro: ['11px', { lineHeight: '1.3', fontWeight: '500' }],
      },
      zIndex: {
        sticky: '10', dropdown: '20', tooltip: '30',
        overlay: '40', modal: '41', toast: '50',
      },
      transitionDuration: {
        150: '150ms', 200: '200ms', 250: '250ms', 400: '400ms',
      },
    },
  },
};
```

### CSS Variables (alternatif non-Tailwind)

```css
:root {
  --bg-base: #0B0D10;
  --bg-sidebar: #0F1114;
  --bg-card: #16181C;
  --bg-card-alt: #1C1F24;
  --bg-card-hover: #22252B;
  --bg-modal: #1A1D22;
  --border-subtle: #2A2D33;
  --border-focus: #FF6A00;

  --accent-primary: #FF6A00;
  --accent-primary-hover: #FF7F1F;
  --accent-primary-active: #E05F00;
  --accent-primary-soft: rgba(255,106,0,0.13);

  --success: #22C55E;
  --danger: #EF4444;
  --warning: #F5A623;
  --info: #3B82F6;

  --text-primary: #FFFFFF;
  --text-secondary: #9CA3AF;
  --text-muted: #6B7280;
  --text-disabled: #4B5563;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 999px;
}
```

---

## 13. Checklist Konsistensi

- [ ] Semua card dalam grup sejenis pakai radius & padding identik.
- [ ] Hanya satu warna aksen dominan per halaman (oranye), warna lain hanya untuk semantik.
- [ ] Semua indikator naik/turun konsisten: warna + arah panah + tanda (tidak warna saja).
- [ ] Tipografi angka besar selalu bold + tabular-nums; label selalu `--text-secondary`.
- [ ] Tidak ada border tegas antar elemen — pemisahan lewat kontras elevation.
- [ ] Semua komponen interaktif punya 5 state terdefinisi (default/hover/active/focus/disabled).
- [ ] Kontras teks memenuhi WCAG AA; warna tidak jadi satu-satunya penanda makna.
- [ ] Breakpoint grid diuji di sm/md/lg/xl.
- [ ] Z-index elemen mengikuti scale (tidak ada nilai acak/hardcoded sembarangan).

Portlane — DESIGN.md

1. Purpose

This document defines the visual direction, interaction model, layout rules, component behavior, and dashboard design standards for Portlane.

Portlane is a multi-tenant communication gateway for Telegram, Discord, SMTP/Email, Generic HTTP Webhook, provider connections, destinations, messages, deliveries, incoming webhooks, API keys, IP allowlists, and operational logs.

The dashboard should follow a premium dark infrastructure dashboard direction with:

near-black background

warm orange primary accent

compact but breathable layout

strong metric cards

thin borders

subtle glow

data-heavy but clean composition

fixed left navigation

high information density without feeling crowded

modern interactive states

concise operational copy

The visual reference is a dark finance dashboard style, but the information architecture and content must be adapted specifically to Portlane.

2. Core Design Direction

Portlane should feel like:

A premium developer infrastructure control center.

Visual characteristics:

Dark
Technical
Structured
Fast
Controlled
Premium
Minimal
Operational

Avoid:

Bright SaaS gradients
Heavy glassmorphism
Large decorative illustrations
Oversized rounded cards
Consumer-app styling
Gaming dashboard styling
Excessive neon effects
Unnecessary animation
Card-inside-card nesting

3. Brand Visual Language

3.1 Default Theme

Portlane is dark-first.

Base surfaces:

App Background        #070707
Sidebar Background    #090909
Card Background       #101010
Elevated Surface      #141414
Input Background      #0D0D0D
Border                #242424
Border Hover          #343434

Text:

Primary Text          #F5F5F5
Secondary Text        #A3A3A3
Muted Text            #737373
Disabled Text         #525252

Primary brand accent:

Portlane Orange       #FF7A00
Orange Hover          #FF8C1A
Orange Active         #E96F00
Orange Soft           rgba(255, 122, 0, 0.12)
Orange Border         rgba(255, 122, 0, 0.28)
Orange Glow           rgba(255, 122, 0, 0.18)

Semantic colors:

Success               #22C55E
Warning               #F59E0B
Error                 #EF4444
Info                  #3B82F6
Processing            #A855F7
Neutral               #737373

Semantic colors should be used for status dots, small badges, values, icons, chart lines, and small indicators—not large card fills.

4. Application Shell

Desktop-first shell:

┌───────────────────────────────────────────────────────────────────────┐
│ Sidebar │ Main Header                                                │
│         ├─────────────────────────────────────────────────────────────│
│         │ Page Content                                               │
│         │                                                            │
│         │                                                            │
└─────────┴─────────────────────────────────────────────────────────────┘

Recommended sizing:

Sidebar expanded: 220–240px
Sidebar collapsed: 68px
Header height: 64–72px
Main content padding: 20–24px
Page gap: 16px
Card gap: 12–16px

Operational pages should use the available horizontal space. Do not constrain them to a narrow marketing-style container.

5. Sidebar

Suggested navigation:

PORTLANE

[ Search...                 ⌘K ]

MAIN
Overview
Providers
Destinations
Messages
Webhooks

OPERATIONS
Deliveries
Logs

SYSTEM
API Keys
IP Access
Settings

Sidebar characteristics:

near-black background

subtle right border

Portlane logo at the top

tenant switcher

command/search field

grouped navigation

compact user section at bottom

If Deliveries is sufficiently covered by Messages, it may remain primarily an operational filtered view.

6. Navigation Styling

Default:

transparent background
muted icon
secondary text

Hover:

background: #151515
text: primary
icon: primary

Active:

background: Portlane Orange
text: white
icon: white

Recommended nav item:

height: 38–42px
radius: 7–8px
horizontal padding: 12px

The active state should be clearly visible, similar to the strong orange selection in the reference.

7. Tenant Switcher

The active tenant must always be visible.

Example:

┌────────────────────────────┐
│ VA  Vanta Arc          ▾   │
│     Production             │
└────────────────────────────┘

Dropdown:

Vanta Arc
Lecture Intelligence
Portlane Internal

──────────────────

+ Create Tenant

8. Search and Command Palette

Sidebar search:

Search...                         ⌘K

Opening it should show a command palette.

Suggested actions:

Go to Overview
Go to Providers
Go to Messages
Go to Webhooks
Create Provider
Create Destination
Send Message
Create API Key
Search message ID
Search delivery ID
Search webhook event ID

Command palette styling:

width: 600–680px
background: #151515
border: #292929
radius: 12px
overlay: semi-transparent black

It should be keyboard navigable.

9. Main Header

Overview example:

Good morning, Winata 👋
Here's what's happening across Portlane today.

Other page example:

Messages
Monitor outbound communication and delivery status.

Right side may include:

Date range
Notifications
Command palette trigger
User quick menu

Keep the header lightweight.

10. Overview Dashboard

Recommended composition:

┌──────────────────────────────────────────────────────────────────────┐
│ Greeting / Summary                                                   │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ Messages     │ Delivered    │ Failed       │ Webhooks               │
├───────────────────────────────────────┬──────────────────────────────┤
│ Delivery Activity                     │ Provider Breakdown           │
├───────────────────────┬───────────────┼──────────────────────────────┤
│ Recent Deliveries     │ Queue Health  │ Provider Health              │
├──────────────────────────────────────────────────────────────────────┤
│ Operational Insight / Warning / Security Event                       │
└──────────────────────────────────────────────────────────────────────┘

The dashboard should feel complete on a normal desktop viewport without excessive scrolling.

11. Metric Cards

Top metrics:

Messages
Delivered
Failed
Webhooks

Optional additional metric:

Success Rate

Example card:

Messages Today
12,482

↑ 8.2% from yesterday

sparkline

Each card includes:

small label

strong large metric

change/supporting text

mini sparkline

circular icon indicator on the top-right

Card style:

background: #101010
border: 1px solid #222
radius: 10–12px
padding: 16px
min-height: 140–160px

Hover:

border: rgba(255,122,0,.25)
transform: translateY(-1px)

Top-right icon:

40–44px circle
orange soft background
orange border
orange icon

12. Sparklines

Use minimal line sparklines with subtle area fill.

No axes or legends.

Default accent:

orange

Semantic exceptions:

Delivered → green
Failed → red/orange
Queued → amber/neutral

13. Delivery Activity

Primary analytics panel:

Delivery Activity

[ 24h | 7d | 30d ]

chart

Recommended series:

Delivered
Failed

Chart rules:

dark surface

muted axes

thin grid lines

orange primary

red failure series

compact hover tooltip

no 3D

no rainbow colors

14. Provider Breakdown

A donut chart is appropriate.

Example:

Telegram          42%
Discord           28%
SMTP              21%
Webhook            9%

Prefer several orange/amber tones plus neutral dark segments rather than provider-brand colors dominating the chart.

15. Provider Health

Example:

Provider Health

Telegram Production        ● Healthy
Discord Alerts             ● Healthy
SMTP Production            ● Degraded
Webhook Internal           ● Healthy

Optional metadata:

Latency
Last checked
Failure rate

Use small status indicators, not full colored rows.

16. Queue Health

Expose:

Queued
Processing
Retrying
Dead

Example:

Queue Health

Queued        28
Processing     6
Retrying       3
Dead           1

This panel should reveal operational backlog immediately.

17. Recent Deliveries

Example:

Telegram   Production Alert       Delivered    120ms
SMTP       Weekly Summary         Delivered    420ms
Webhook    Order Event            Failed       5.2s
Discord    Build Notification     Delivered    180ms

Each row should include:

provider icon

message title

timestamp

status

latency when useful

Clicking a row opens message/delivery detail.

18. Operational Insight Banner

Bottom overview panel example:

Portlane is operating normally.

99.6% of deliveries succeeded during the last 24 hours.

Or degraded state:

SMTP Production is degraded.

12 deliveries failed because authentication was rejected.

[ View Provider ]

It can include a subtle orange chart/illustration, but it must remain functional rather than decorative.

19. Providers Page

Header:

Providers

Connect and manage communication providers.

                                      [ + Add Provider ]

Provider card:

┌─────────────────────────────────┐
│ Telegram                        │
│ Production Bot                  │
│                                 │
│ ● Connected                     │
│                                 │
│ 12 destinations                 │
│ 2.4k deliveries today           │
│                                 │
│ [ Test Connection ]        •••  │
└─────────────────────────────────┘

Grid:

3 columns wide desktop
2 columns medium
1 column small

Do not fill cards with provider brand colors. Keep Portlane's dark/orange language dominant.

20. Add Provider

Use a modal or sheet.

Step 1:

Choose Provider

Telegram
Discord
SMTP
Webhook

Selected provider:

orange border
orange soft background

Then render the provider-specific configuration.

Telegram example:

Connection Name
Bot Token
Default Parse Mode

Actions:

[ Test Connection ]
[ Save Provider ]

Avoid a large wizard unless future complexity requires it.

21. Destinations

Prefer a table:

Name
Provider
Connection
Type
Status
Updated
Actions

Example:

Trading Alerts   Telegram   Production Bot   Chat      Active
Admin Email      SMTP       Production       Email     Active
Build Alerts     Discord    Engineering      Channel   Active
API Relay        Webhook    Internal         HTTP      Active

22. Messages

Header:

Messages

Track outbound communication and delivery status.

[ Search... ] [ Provider ▾ ] [ Status ▾ ] [ Date ▾ ]   [ Send Message ]

Table:

Message
Destinations
Delivered
Failed
Status
Created

Message cell:

Production Alert
API production unavailable...

msg_01J...

Use monospace only for technical IDs.

23. Message Summary Status

A multi-destination message should use a summary such as:

3 / 3 Delivered

4 Delivered · 1 Failed

2 Processing · 3 Queued

Do not reduce a message with mixed delivery states to a misleading single status.

24. Message Detail

Example:

Production Alert

msg_01J8...
Created 2 minutes ago

                                      3 / 3 Delivered

Content:

Message

Subject
Production Alert

Body
Production API is unavailable.

Below it:

Deliveries

Delivery rows remain compact and highly readable.

25. Delivery Row

Success:

Telegram
Production Bot → Trading Alerts

● Delivered

120 ms
2 minutes ago

                                              >

Failed:

SMTP
Production → admin@example.com

● Failed

Authentication rejected

                                    [ Retry ]   >

26. Delivery Detail Drawer

Use a right drawer around 420–520px wide.

Example:

Delivery Detail

dlv_01J...

Status
Failed

Provider
SMTP Production

Destination
admin@example.com

Attempts
3

────────────────────────

Attempt #3
535 Authentication failed
10:32:03

Attempt #2
535 Authentication failed
10:31:33

Attempt #1
Connection timeout
10:31:23

This should preserve the parent context instead of forcing a page change.

27. Webhooks

Use tabs:

Endpoints
Events

Endpoint:

Payment Callback

/hooks/wh_xxx

● Active

Security
IP Allowlist + Secret

1,284 events today

Event table:

Time
Endpoint
Method
Source IP
Status
Duration

Example:

10:31:20   Payment Callback   POST   34.120.x.x   Forwarded   220ms
10:31:18   Payment Callback   POST   34.120.x.x   Failed      4.2s
10:31:12   Payment Callback   POST   118.x.x.x    Blocked     —

Blocked traffic must stay visible for operational debugging.

28. Logs

Logs represent operational events, not raw server logs.

Categories:

Delivery
Webhook
Security
Provider
System

Example:

10:31:20

Delivery succeeded

Telegram Production
Trading Alerts

dlv_01J...

Security example:

10:30:12

Request blocked by IP policy

Production API
118.x.x.x

29. API Keys

Example:

Production API

pl_live_abcd••••••••

● Active

Last used
2 minutes ago

IP Rules
2

                                              Manage

Full secrets are shown only once during creation.

30. IP Access

Example:

IP / CIDR            Scope              Description           Status
103.20.10.40/32      Production API     Mini server API       Active
10.10.0.0/16         Internal API       Internal network      Active

Use monospace for network values.

31. Inputs

Recommended style:

height: 38–42px
background: #0D0D0D
border: #292929
radius: 7–8px
text: #F5F5F5

Focus:

border: Portlane Orange
box-shadow: 0 0 0 3px rgba(255,122,0,.10)

32. Buttons

Primary:

background: Portlane Orange
text: white

Secondary:

background: #171717
border: #2A2A2A
text: primary

Ghost:

transparent
hover: #171717

Destructive:

soft red surface
red border

Sizing:

height: 36–40px
radius: 7–8px

33. Status Badges

Examples:

● Delivered
● Failed
● Processing
● Queued
● Retrying
● Dead
● Connected
● Disabled

Use subtle tinted backgrounds:

success: rgba(34,197,94,.10)
error:   rgba(239,68,68,.10)
warning: rgba(245,158,11,.10)

34. Typography

Recommended:

Geist

Fallbacks:

Inter
SF Pro

Technical font:

Geist Mono
JetBrains Mono
SF Mono

Scale:

Greeting small            13–14px
Page title                22–26px
Page subtitle             13–14px
Card title                13–14px
Primary metric            24–28px
Body                      13–14px
Table                     13px
Metadata                  11–12px

35. Iconography

Use one family consistently:

Lucide

Typical sizes:

16px navigation
16px buttons
18–20px card icons

Do not mix multiple icon sets.

36. Tables

Rules:

dark surface

compact rows

clear header

horizontal separators only

row hover

optional sticky header

semantic statuses

right-aligned actions

pagination

Recommended row height:

48–56px

Hover:

background: #151515

Do not use bright orange hover backgrounds.

37. Filters

Compact filter bar:

[ Search messages... ]

[ Status ▾ ]
[ Provider ▾ ]
[ Date ▾ ]

                                         Clear

Active filters can appear as small chips.

38. Toasts

Placement:

top-right

Success:

Connection successful
Telegram Production is reachable.

Failure:

Delivery failed
SMTP rejected the configured credentials.

Avoid generic messages like:

Something went wrong

39. Empty States

Example:

No providers connected

Connect Telegram, Discord, SMTP, or Webhook
to start routing messages.

[ Add Provider ]

Use a small icon, not a huge decorative illustration.

40. Loading and Error States

Loading:

metric-card skeleton

chart skeleton

row skeleton

detail skeleton

Avoid full-page spinners for routine navigation.

Section error example:

Provider Health

Unable to load provider health.

[ Retry ]

Other sections should remain functional.

41. Motion

Timing:

120–180ms small interactions
180–240ms modal/drawer

Use motion for:

hover

dropdown

drawer

modal

tabs

status transition

Avoid:

bouncing

long fades

decorative loops

dramatic scale effects

42. Real-Time UI

Good candidates:

Queued → Processing → Delivered
Provider health
Webhook events
Recent failures
Dashboard metrics

Use SSE, WebSocket, or polling according to architecture.

Keep live transitions subtle.

43. Responsive Rules

Primary target:

1440px+ desktop

Also support:

1024–1439px laptop
768–1023px tablet
<768px mobile usable mode

Desktop grid:

12 columns
gap: 16px

Typical composition:

Top metrics: 4 × 3 columns
Main chart: 8 columns
Provider breakdown: 4 columns
Lower panels: 4 + 4 + 4

On smaller screens:

wrap metric cards

reduce 2-column panels to 1 column

collapse sidebar

allow table horizontal scroll or compact card mode

make drawers full-screen on mobile

44. Accessibility

Minimum:

WCAG AA contrast

keyboard navigation

visible focus ring

semantic HTML

accessible modal focus trap

status text plus icon, not color only

keyboard-accessible tooltips

clear form error relationships

45. Security UI

Example:

IP Restriction

Only requests from configured IP ranges may use this API key.

● Enabled

2 allowed ranges

If no rule exists:

Add at least one IP or CIDR before enabling this restriction.

Secret fields:

Bot Token

Configured
••••••••••••••••

[ Replace ]

Never prefill the actual stored credential.

46. JSON Viewer

Webhook and provider payload inspection should support:

syntax highlighting
expand/collapse
copy
wrap toggle

Sensitive values must be redacted before rendering.

47. Technical Values

Use monospace for:

msg_01J...
dlv_01J...
evt_01J...
req_01J...
103.20.10.40/32
POST
/api/v1/messages

Provide copy interactions where useful.

48. Dashboard Wireframe

┌───────────────────────────────────────────────────────────────────────────┐
│ PORTLANE        Good morning, Winata 👋                    Sep 12   🔔    │
│                 Here's what's happening across Portlane today.            │
├─────────────────┬─────────────────────────────────────────────────────────┤
│ Search...    ⌘K │                                                         │
│                 │ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────┐ │
│ MAIN            │ │ Messages   │ │ Delivered  │ │ Failed     │ │Webhook│ │
│ Dashboard       │ │ 12,482     │ │ 12,331     │ │ 21         │ │ 1,832 │ │
│ Providers       │ │ ↑ 8.2%     │ │ 99.6%      │ │ ↓ 12%      │ │ ↑ 4%  │ │
│ Destinations    │ │ ～～～～～  │ │ ～～～～～  │ │ ～～～～～  │ │～～～  │ │
│ Messages        │ └────────────┘ └────────────┘ └────────────┘ └───────┘ │
│ Webhooks        │                                                         │
│                 │ ┌────────────────────────────────┐ ┌──────────────────┐ │
│ OPERATIONS      │ │ Delivery Activity              │ │ Provider Mix     │ │
│ Deliveries      │ │                                │ │                  │ │
│ Logs            │ │        chart                   │ │      donut       │ │
│                 │ │                                │ │                  │ │
│ SYSTEM          │ └────────────────────────────────┘ └──────────────────┘ │
│ API Keys        │                                                         │
│ IP Access       │ ┌──────────────────┐ ┌────────────────┐ ┌─────────────┐ │
│ Settings        │ │ Recent Delivery  │ │ Queue Health   │ │Provider Hlth│ │
│                 │ │                  │ │                │ │             │ │
│                 │ │ ...              │ │ ...            │ │ ...         │ │
│                 │ └──────────────────┘ └────────────────┘ └─────────────┘ │
│                 │                                                         │
│ Winata       ▾  │ ┌─────────────────────────────────────────────────────┐ │
│ Owner           │ │ Operational Insight                                 │ │
│                 │ │ 99.6% delivery success. All core providers healthy. │ │
│                 │ └─────────────────────────────────────────────────────┘ │
└─────────────────┴─────────────────────────────────────────────────────────┘

49. Design Anti-Patterns

Do not implement:

white cards on dark background
full-provider-color cards
large gradients
glassmorphism blur everywhere
20px+ corner radius everywhere
large marketing hero sections
3D charts
overly playful illustrations
rainbow charts
many competing accent colors
deep nested cards
raw unformatted JSON

50. Reusable Frontend Primitives

Build reusable components for:

AppShell
Sidebar
TenantSwitcher
PageHeader
MetricCard
StatusBadge
DataTable
FilterBar
ProviderIcon
EmptyState
ErrorState
Skeleton
Drawer
Modal
CommandPalette
JsonViewer
CopyButton
ChartCard
OperationalEventRow

Avoid one-off page-specific styling when a reusable primitive makes sense.

51. Design Tokens

Centralize:

background
surface
surfaceElevated
surfaceInteractive

border
borderHover

textPrimary
textSecondary
textMuted

accent
accentHover
accentSoft
accentBorder

success
warning
error
info

radiusSm
radiusMd
radiusLg

space1
space2
space3
space4
space5
space6

Do not scatter arbitrary colors throughout components.

52. Final Design Principle

Portlane should look like a polished infrastructure control center that is:

Dark, structured, fast, premium, and operationally clear.

The supplied dashboard reference should influence:

layout density

dark surfaces

orange accent

metric card structure

active navigation

chart presentation

panel hierarchy

compact operational composition

But Portlane must remain its own product and use Portlane-specific content.

A user should understand within seconds:

Is Portlane healthy?
Are messages being delivered?
Which provider has a problem?
Are queues building up?
Which deliveries failed?
Are webhook requests being blocked?
Can I act on the issue immediately?

Dense without being crowded. Dark without losing hierarchy. Interactive without being distracting. Technical without being difficult.