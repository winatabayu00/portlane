# DESIGN.md

# Portlane — Product Design System & Dashboard UX

## 1. Purpose

Dokumen ini menjadi source of truth untuk desain UI/UX Portlane.

Portlane adalah multi-tenant communication gateway untuk mengelola:

* Telegram
* Discord
* SMTP / Email
* Generic Webhook
* Provider connections
* Destinations
* Messages
* Deliveries
* Incoming webhooks
* API keys
* IP whitelist
* Delivery logs

Desain harus terasa:

> **Modern, clean, interactive, technical, fast, and trustworthy.**

Portlane bukan dashboard enterprise yang penuh tabel dan form padat.

Portlane juga bukan landing page marketing yang terlalu dekoratif.

Portlane harus terasa seperti modern developer infrastructure product.

---

# 2. Design Direction

Visual direction:

```text
Clean SaaS
+
Developer Tool
+
Infrastructure Dashboard
+
Modern Monitoring Interface
```

Karakter UI:

* minimal
* spacious
* precise
* calm
* data-oriented
* responsive
* high signal-to-noise ratio
* subtle motion
* clear hierarchy

Hindari:

* terlalu banyak border
* shadow berat
* gradient berlebihan
* card di dalam card
* terlalu banyak warna
* tabel yang terlalu padat
* icon berlebihan
* animasi dekoratif
* neumorphism
* glassmorphism berlebihan

---

# 3. Product Personality

Portlane harus terasa:

```text
Reliable
Technical
Controlled
Fast
Secure
Professional
```

Bukan:

```text
Playful
Social
Gaming
Overly futuristic
Overly corporate
```

---

# 4. Design Philosophy

## 4.1 Information First

Data operasional adalah fokus utama.

User harus dapat dengan cepat melihat:

```text
What happened?
Where?
When?
Through which provider?
Did it succeed?
If not, why?
```

---

## 4.2 Progressive Disclosure

Jangan tampilkan semua informasi sekaligus.

Contoh:

```text
Messages List
    ↓
Message Detail
    ↓
Delivery
    ↓
Attempt Detail
```

Gunakan:

* drawer
* expandable row
* detail panel
* tooltip
* popover

untuk informasi sekunder.

---

## 4.3 Action Near Context

Action harus berada dekat dengan objek terkait.

Contoh:

```text
Failed Delivery

SMTP
Authentication failed

[Retry]
```

Jangan membuat user harus masuk ke menu lain untuk menjalankan aksi sederhana.

---

## 4.4 Minimal Navigation Depth

Target:

```text
2–3 interaction
```

untuk mencapai mayoritas fitur penting.

Contoh:

```text
Messages
→ Message
→ Delivery
```

Jangan membuat hierarchy terlalu dalam.

---

# 5. Application Shell

Desktop structure:

```text
┌─────────────────────────────────────────────────────────────┐
│ Sidebar │                    Main Area                       │
│         │                                                    │
│ Logo    │ Topbar                                             │
│ Tenant  ├────────────────────────────────────────────────────│
│         │                                                    │
│ Overview│ Page Header                                        │
│ Provider│                                                    │
│ Dest.   │ Content                                            │
│ Message │                                                    │
│ Webhook │                                                    │
│ Logs    │                                                    │
│         │                                                    │
│ Setting │                                                    │
└─────────────────────────────────────────────────────────────┘
```

Gunakan fixed sidebar pada desktop.

Main area harus scroll secara independen bila memungkinkan.

---

# 6. Sidebar

Width:

```text
240–260px
```

Collapsed:

```text
64–72px
```

Struktur:

```text
Portlane

[ Tenant Switcher ]

Overview

Gateway
├ Providers
├ Destinations
├ Messages
└ Webhooks

Operations
├ Logs
└ Deliveries

Settings
```

Catatan:

Jika `Deliveries` terlalu redundant dengan Messages, boleh tidak menjadi menu utama.

Delivery dapat dibuka melalui Message Detail dan Logs.

---

# 7. Sidebar Style

Gunakan:

* icon sederhana
* text label
* active state yang jelas
* hover subtle
* section separator minimal

Active state sebaiknya menggunakan:

```text
soft background
+
strong text
+
small accent indicator
```

Hindari active state dengan warna yang terlalu mencolok.

---

# 8. Tenant Switcher

Tenant switcher ditempatkan di area atas sidebar.

Example:

```text
┌───────────────────────┐
│ VA  Vanta Arc      ▾  │
│     Production        │
└───────────────────────┘
```

Dropdown:

```text
Vanta Arc
Lecture Intelligence
Portlane Internal

────────────

+ Create Tenant
```

User harus selalu mengetahui tenant aktif.

---

# 9. Topbar

Topbar berisi:

```text
Page breadcrumb / title

                       Search
                       Notifications
                       User Menu
```

Optional global search:

```text
Search message ID, delivery ID, webhook event...
```

Keyboard shortcut:

```text
⌘ K
Ctrl K
```

untuk command/search palette.

---

# 10. Command Palette

Portlane sebaiknya memiliki command palette sederhana.

Shortcut:

```text
⌘ K
```

Contoh:

```text
Search Portlane...

Actions

Send Message
Add Provider
Create Destination
Create API Key

Navigation

Messages
Providers
Webhooks
Logs
Settings
```

Ini memberi kesan modern tanpa membuat UI rumit.

---

# 11. Page Header

Pattern:

```text
Messages

Inspect outbound messages and provider deliveries.

                            [ Send Message ]
```

Struktur:

```text
Title
Description
Primary Action
Optional Secondary Action
```

Jangan gunakan page title yang terlalu besar.

---

# 12. Content Width

Untuk halaman operasional:

```text
max-width: none
```

dengan padding:

```text
24–32px desktop
16–20px tablet/mobile
```

Untuk settings/forms:

```text
max-width: 800–1000px
```

agar tidak terlalu lebar.

---

# 13. Grid System

Desktop:

```text
12-column grid
```

Spacing base:

```text
4px
```

Recommended spacing:

```text
4
8
12
16
20
24
32
40
48
64
```

---

# 14. Visual Hierarchy

Hierarchy:

```text
Page Title
Section Title
Primary Metric
Primary Content
Secondary Metadata
Helper Text
```

Metadata harus menggunakan contrast lebih rendah.

Contoh:

```text
Telegram Production
Connected

Last checked 2 minutes ago
```

---

# 15. Typography

Gunakan sans-serif modern.

Recommended categories:

```text
Inter
Geist
SF Pro
Manrope
```

Developer data / technical identifier dapat menggunakan monospace:

```text
Geist Mono
JetBrains Mono
SF Mono
```

Gunakan monospace hanya untuk:

* IDs
* API keys
* IP address
* CIDR
* URLs
* HTTP status
* timestamps tertentu
* code payload

Jangan gunakan monospace untuk seluruh UI.

---

# 16. Typography Scale

Example:

```text
Page title
28–32px

Section title
18–20px

Card metric
24–30px

Body
14–15px

Table
13–14px

Metadata
12–13px
```

---

# 17. Color Philosophy

Gunakan mostly neutral UI.

Base:

```text
Background
Surface
Elevated Surface
Border
Primary Text
Secondary Text
Muted Text
```

Accent color hanya digunakan untuk:

* primary actions
* active navigation
* selected controls
* links

Status colors digunakan secara semantic:

```text
Green  → success
Red    → error
Amber  → warning/retry
Blue   → processing/info
Gray   → queued/inactive
```

Jangan mewarnai seluruh card berdasarkan status.

Gunakan color hanya pada:

* badge
* icon
* small indicator
* chart element

---

# 18. Light & Dark Mode

Portlane sebaiknya mendukung:

```text
System
Light
Dark
```

Dark mode harus benar-benar didesain, bukan sekadar invert.

Dark background harus tetap mempunyai hierarchy antar surface.

---

# 19. Surface Style

Gunakan hierarchy:

```text
Page Background
    ↓
Primary Surface
    ↓
Elevated / Interactive Surface
```

Border tipis lebih disukai dibanding heavy shadow.

Shadow hanya digunakan untuk:

* dropdown
* modal
* command palette
* floating drawer
* popover

---

# 20. Border Radius

Gunakan radius konsisten.

Recommended:

```text
Buttons
8px

Inputs
8px

Cards
10–12px

Modals
12–16px
```

Jangan terlalu rounded sampai terasa seperti consumer social app.

---

# 21. Buttons

Variants:

```text
Primary
Secondary
Ghost
Destructive
Icon
```

Primary action hanya satu dominan per area.

Contoh:

```text
[ Add Provider ]

Test Connection
```

Bukan:

```text
[ Add ]
[ Test ]
[ Edit ]
[ Configure ]
```

semuanya primary.

---

# 22. Status Badge

Standard status:

```text
Delivered
Processing
Queued
Retrying
Failed
Dead
Active
Disabled
Connected
```

Badge harus:

* kecil
* subtle background
* readable
* semantic

Example:

```text
● Delivered
● Failed
```

---

# 23. Cards

Cards hanya digunakan ketika grouping memang penting.

Use:

```text
Overview metrics
Provider connection
Empty state
Quick actions
```

Jangan gunakan card untuk setiap section tanpa alasan.

---

# 24. Dashboard Overview

Overview layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Good morning                                            │
│ Portlane is operating normally.                         │
└──────────────────────────────────────────────────────────┘


Messages       Delivered       Failed        Webhooks
12,482         12,331          21            1,832
+8.2%          99.6%           -12%          +4.1%


Delivery Activity
───────────────────────────────────────────────────────────
                           chart


Provider Health                 Recent Failures
──────────────────              ───────────────────────────
Telegram  Healthy               SMTP Authentication failed
Discord   Healthy               Webhook Timeout
SMTP      Degraded              Telegram Rate Limited
Webhook   Healthy
```

---

# 25. Dashboard Metrics

Metric cards minimum:

```text
Messages
Deliveries
Success Rate
Failed
Webhooks
```

Jangan terlalu banyak KPI.

Portlane bukan analytics dashboard.

---

# 26. Delivery Activity Chart

Gunakan chart sederhana.

Possible:

```text
Delivered
Failed
```

over:

```text
24h
7d
30d
```

Hindari chart 3D, pie chart berlebihan, atau terlalu banyak warna.

---

# 27. Provider Health

Provider health card:

```text
Provider Health

Telegram Production       ● Healthy
Discord Engineering       ● Healthy
SMTP Production            ● Degraded
Webhook Internal           ● Healthy
```

Optional metadata:

```text
Last check
Latency
```

---

# 28. Providers Page

Layout:

```text
Providers

Manage communication provider connections.

[ + Add Provider ]
```

Provider cards/grid:

```text
┌────────────────────────────┐
│ Telegram                   │
│ Production Bot             │
│                            │
│ ● Connected                │
│                            │
│ 12 destinations            │
│ Last tested 2m ago         │
│                            │
│ [ Test ]              •••  │
└────────────────────────────┘
```

---

# 29. Add Provider Flow

Use modal or sheet.

Step 1:

```text
Choose Provider

Telegram
Discord
SMTP
Webhook
```

Step 2:

Dynamic provider form.

Example Telegram:

```text
Connection Name

Bot Token

Default Parse Mode
```

Step 3:

```text
Test Connection
```

Step 4:

```text
Connection Successful

[ Save Provider ]
```

Avoid multi-page wizard unless complexity increases later.

---

# 30. Provider Detail

Recommended layout:

```text
Telegram Production

● Connected

[ Test Connection ] [ Edit ] [...]

Overview
Destinations
Activity
Settings
```

Provider summary:

```text
Provider      Telegram
Status        Connected
Destinations 12
Created       12 Sep 2026
Last Test     2 minutes ago
```

---

# 31. Destinations Page

Table:

```text
Name               Provider              Type       Status
Trading Alerts     Telegram Production   Chat       Active
Engineering        Discord               Channel    Active
Admin              SMTP                  Email      Active
Production API     Webhook                HTTP       Active
```

Filters:

```text
Provider
Status
Search
```

---

# 32. Messages Page

Messages adalah pusat observability outbound.

Layout:

```text
Messages

Search...
[ Provider ▾ ] [ Status ▾ ] [ Date ▾ ]

────────────────────────────────────────────────────────────

Message            Destinations   Delivered   Failed   Created
msg_01...          3              3           0        10:31
msg_02...          5              4           1        10:29
```

---

# 33. Message Row

Jangan tampilkan body penuh.

Gunakan preview:

```text
Production Alert

API production unavailable...

msg_01J...
```

Click membuka message detail.

---

# 34. Message Detail

Gunakan dedicated page atau side panel pada desktop.

Header:

```text
Production Alert

msg_01J...
Created 10:31:22

                           3 Delivered
```

Content:

```text
Message

Production API is unavailable.
```

Deliveries:

```text
Telegram Production
Trading Alerts
● Delivered
120ms

Discord Engineering
#alerts
● Delivered
180ms

SMTP Production
admin@example.com
● Failed

Authentication failed

[ Retry ]
```

---

# 35. Delivery Detail Drawer

Klik delivery membuka right drawer:

```text
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

────────────────────

Attempt #3
10:32:03
535 Authentication failed

Attempt #2
10:31:33
535 Authentication failed

Attempt #1
10:31:23
Connection timeout
```

Drawer menjaga user tetap berada pada Message Detail.

---

# 36. Webhooks Page

Layout:

Tabs:

```text
Endpoints
Events
```

Endpoints:

```text
Payment Callback

/hooks/wh_xxxx

● Active

Security
IP Allowlist + Secret

Events today
1,284
```

---

# 37. Webhook Endpoint Detail

Header:

```text
Payment Callback

● Active

[ Copy Endpoint ] [ Edit ]
```

Sections:

```text
Endpoint
Security
Forwarding
Recent Events
```

Security card:

```text
IP Allowlist
3 rules

Signature
Enabled

Rate Limit
100 req/min
```

---

# 38. Webhook Events

Event list:

```text
Time       Method   Source IP       Status      Duration
10:31:20   POST     34.120.x.x      Forwarded   220 ms
10:31:18   POST     34.120.x.x      Failed      4.2 s
10:31:12   POST     118.x.x.x       Blocked     —
```

Blocked requests tetap terlihat.

---

# 39. Webhook Event Detail

Layout:

```text
Event
evt_01...

Status
Forwarded

Source
34.xxx.xxx.xxx

Received
10:31:20.123

────────────────────────────

Request

Headers
Payload

────────────────────────────

Forwarding

Attempt #1
200 OK
220ms
```

Sensitive header harus tampil sebagai:

```text
Authorization
••••••••••••
```

---

# 40. Logs Page

Logs bukan raw server log viewer.

Logs adalah operational event history.

Categories:

```text
Delivery
Webhook
Security
Provider
System
```

Example:

```text
10:31:20

Delivery succeeded

Telegram Production
Trading Alerts

dlv_01J...
```

Security:

```text
10:30:12

Request blocked by IP policy

API Key
Production API

Source
118.xxx.xxx.xxx
```

---

# 41. Log Filters

Filters:

```text
Type
Status
Provider
Date
Search
```

Support search for:

```text
message ID
delivery ID
webhook event ID
request ID
```

---

# 42. Settings Page

Settings navigation:

```text
General
Members
API Keys
IP Access
Appearance
```

Keep settings separate from operational pages.

---

# 43. API Keys Page

Example:

```text
Production API

pl_live_abcd••••••••

● Active

Last used
2 minutes ago

IP Rules
2

[ Manage ]
```

Key secret tidak pernah ditampilkan lagi setelah creation.

---

# 44. Create API Key

Modal:

```text
Create API Key

Name
Production Backend

Rate Limit
Optional

IP Restriction
○ Allow from anywhere
● Restrict by IP

[ Create ]
```

Setelah create:

```text
API Key Created

pl_live_abcd.xxxxxxxxxxxxxxxxx

This secret will only be shown once.

[ Copy ]
```

---

# 45. IP Allowlist UI

Gunakan table sederhana:

```text
Allowed IPs

103.20.10.40/32
Production Server

10.10.0.0/16
Internal Network

[ + Add IP ]
```

Add dialog:

```text
IP / CIDR

103.20.10.40/32

Description
Production Server
```

Validation feedback harus immediate.

---

# 46. Interactive Behavior

Interaction harus terasa cepat.

Gunakan:

* optimistic UI hanya untuk safe action
* skeleton loading
* subtle hover transitions
* inline state changes
* drawer untuk detail
* command palette
* keyboard navigation
* copy buttons
* toast feedback

---

# 47. Motion

Motion harus subtle.

Duration:

```text
120–220ms
```

Gunakan untuk:

```text
dropdown
drawer
modal
hover
tab indicator
status update
```

Jangan gunakan:

* bouncing
* overshoot besar
* decorative looping animation

---

# 48. Live Updates

Karena Portlane adalah operational dashboard, gunakan real-time update bila infrastructure memungkinkan.

Ideal candidates:

```text
Delivery status
Provider status
Webhook event
Recent failures
Dashboard metrics
```

Interaction example:

```text
QUEUED
    ↓
PROCESSING
    ↓
DELIVERED
```

status berubah tanpa refresh.

Gunakan WebSocket/SSE bila memang diperlukan.

Jika tidak, polling ringan dapat digunakan pada V1.

---

# 49. Status Transition UX

Contoh delivery:

```text
● Queued

↓

◌ Processing

↓

● Delivered
```

Transition boleh menggunakan subtle pulse pada `Processing`.

Jangan animate success terus-menerus.

---

# 50. Toasts

Gunakan toast untuk:

```text
Provider saved
Connection successful
API key copied
Delivery retry queued
Destination created
```

Error toast harus memiliki actionable message.

Bad:

```text
Something went wrong
```

Better:

```text
Connection failed

Telegram rejected the configured bot token.
```

---

# 51. Empty States

Empty state harus membantu user bergerak.

Example Providers:

```text
No providers connected

Connect Telegram, Discord, SMTP, or Webhook
to start sending messages.

[ Add Provider ]
```

Bukan hanya:

```text
No data.
```

---

# 52. Loading States

Gunakan skeleton untuk:

* dashboard cards
* tables
* message details
* provider cards

Jangan gunakan full-screen spinner untuk navigasi halaman biasa.

---

# 53. Error States

Section-level failure lebih baik daripada merusak seluruh page.

Example:

```text
Provider Health

Unable to load provider health.

[ Retry ]
```

Overview metric lain tetap tampil.

---

# 54. Confirmation Dialog

Gunakan hanya untuk destructive/high-risk action.

Examples:

```text
Delete Provider
Revoke API Key
Delete Destination
Disable Webhook Endpoint
```

Jangan gunakan confirmation untuk action rutin seperti:

```text
Test Connection
Retry Delivery
Copy URL
```

---

# 55. Tables

Tables harus clean dan readable.

Gunakan:

```text
sticky header
row hover
sorting
filters
pagination
```

Avoid:

* vertical borders
* heavy grid lines
* excessive columns

Jika lebih dari 7–8 columns, pertimbangkan:

* hide secondary columns
* column selector
* detail drawer

---

# 56. Filters

Gunakan filter bar yang compact:

```text
[ Search... ]

[ Status ▾ ]
[ Provider ▾ ]
[ Date ▾ ]

                Clear
```

Filter aktif dapat tampil sebagai chips.

---

# 57. Pagination

Gunakan:

```text
Previous
1
2
3
...
Next
```

atau cursor pagination untuk operational history.

Jangan infinite scroll untuk logs yang membutuhkan reference posisi jelas.

---

# 58. Search

Search harus mendukung IDs.

Examples:

```text
msg_...
dlv_...
evt_...
req_...
```

Jika input terdeteksi sebagai exact ID, prioritaskan exact match.

---

# 59. Copy Interaction

Technical values harus mudah disalin.

Example:

```text
msg_01J89F...      ⧉
```

Hover:

```text
Copy Message ID
```

Setelah copy:

```text
Copied
```

---

# 60. Technical Data Presentation

Gunakan monospace untuk:

```text
msg_01J...
dlv_01J...
103.20.10.40
/api/v1/messages
POST
200
```

Tetapi jangan berlebihan.

---

# 61. JSON Viewer

Webhook payload dan provider response perlu JSON viewer.

Features:

```text
syntax highlighting
expand/collapse
copy
word wrap toggle
```

Optional later:

```text
search within JSON
```

Sensitive values harus masked.

---

# 62. Responsive Strategy

Primary target:

```text
Desktop
```

Secondary:

```text
Tablet
```

Mobile support tetap usable tetapi tidak perlu menjadi primary workflow.

---

# 63. Tablet

Sidebar berubah menjadi compact/collapsible.

Tables dapat menggunakan horizontal scroll bila perlu.

Detail drawer tetap digunakan.

---

# 64. Mobile

Navigation:

```text
drawer sidebar
```

Tables diubah menjadi:

```text
stacked rows/cards
```

contoh:

```text
Production Alert

3 destinations
2 delivered
1 failed

10:31
```

---

# 65. Accessibility

Minimum:

* keyboard navigable
* visible focus ring
* semantic HTML
* ARIA where appropriate
* contrast WCAG AA
* status tidak bergantung pada warna saja
* form error jelas
* modal focus trap
* accessible dropdown
* accessible tooltip

---

# 66. Provider Icons

Provider icon dapat digunakan untuk recognition.

Examples:

```text
Telegram icon
Discord icon
Mail icon
Webhook icon
```

Jangan mengandalkan brand color sebagai satu-satunya identitas.

---

# 67. Provider Color Usage

Provider brand color boleh digunakan secara sangat terbatas.

Example:

```text
small provider icon
small accent
```

Jangan membuat Telegram card seluruhnya biru atau Discord seluruhnya ungu.

Portlane harus tetap punya visual language sendiri.

---

# 68. Dashboard Density

Default density:

```text
Comfortable
```

Bukan compact.

Developer dashboard tetap membutuhkan whitespace untuk readability.

Advanced density toggle tidak diperlukan V1.

---

# 69. Overview Interaction

Dashboard metrics dapat diklik.

Example:

```text
Failed
21
```

click →

```text
Messages
Status = Failed
```

Ini membuat dashboard terasa interaktif tanpa fitur yang berlebihan.

---

# 70. Quick Actions

Overview dapat memiliki quick actions:

```text
Send Message
Add Provider
Create Destination
Create API Key
```

Gunakan command menu/dropdown, bukan empat tombol besar sekaligus.

---

# 71. Send Message UI

Untuk testing/manual sending.

Layout:

```text
Send Message

Destinations
[ Search destinations... ]

Selected
Telegram / Trading Alert
Email / Admin

Subject

Message

[ Send Message ]
```

Optional preview:

```text
2 deliveries will be created.
```

---

# 72. Provider Connection Test UX

Saat test:

```text
Testing connection...
```

Result:

```text
✓ Connection successful

Latency
120ms
```

atau:

```text
Connection failed

Authentication rejected by Telegram.

Check the configured bot token.
```

---

# 73. Security UX

Security-sensitive settings harus jelas namun tidak menakutkan.

Example:

```text
IP Restriction

Only requests from the configured IP addresses
will be allowed to use this API key.

[ Enabled ]
```

Jika user mengaktifkan allowlist tanpa IP:

```text
Add at least one IP address before enabling restriction.
```

---

# 74. Dangerous Settings

Danger zone:

```text
Delete Tenant
```

harus dipisahkan jelas dari settings biasa.

Jangan campur danger action dengan normal configuration.

---

# 75. Audit / Change Metadata

Untuk sensitive resource, tampilkan metadata ringan.

Example:

```text
Created
12 Sep 2026

Updated
12 Sep 2026

Last used
2 minutes ago
```

Advanced full audit trail tidak wajib V1.

---

# 76. Notification Center

Topbar notification icon optional.

Jika ada, hanya untuk meaningful operational events:

```text
Provider disconnected
High delivery failure rate
Webhook endpoint disabled
```

Jangan membuat notification center berisik.

---

# 77. Critical Alert Banner

Untuk severe issue:

```text
SMTP Production is failing authentication.

12 deliveries failed in the last 10 minutes.

[ View Provider ]
```

Banner dapat muncul di Overview.

---

# 78. Health Indicator

Global health kecil di sidebar/footer:

```text
● All systems operational
```

atau:

```text
● 1 provider degraded
```

Click membuka provider health.

---

# 79. Microcopy

Gunakan bahasa yang langsung dan technical.

Bad:

```text
Oops! Something went wrong.
```

Preferred:

```text
Delivery failed

SMTP rejected the configured credentials.
```

---

# 80. Date & Time

Gunakan human-readable + precise detail.

List:

```text
2 minutes ago
```

Hover:

```text
12 Sep 2026, 10:31:22 GMT+7
```

Technical detail dapat menampilkan UTC bila diperlukan.

---

# 81. Main Dashboard Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PORTLANE                Overview                         ⌘K   ●   W  │
├───────────────────┬──────────────────────────────────────────────────┤
│                   │                                                  │
│ Vanta Arc      ▾  │ Overview                                         │
│                   │ Monitor messages, providers and webhook traffic. │
│ Overview          │                                                  │
│                   │ ┌─────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐ │
│ Gateway           │ │Messages │ │Delivery │ │Failed  │ │Webhooks │ │
│ Providers         │ │12,482   │ │99.6%    │ │21      │ │1,832    │ │
│ Destinations      │ └─────────┘ └─────────┘ └────────┘ └─────────┘ │
│ Messages          │                                                  │
│ Webhooks          │ Delivery Activity                                │
│                   │ ┌──────────────────────────────────────────────┐ │
│ Operations        │ │                                              │ │
│ Logs              │ │                  chart                       │ │
│                   │ │                                              │ │
│ Settings          │ └──────────────────────────────────────────────┘ │
│                   │                                                  │
│                   │ Provider Health       Recent Failures            │
│                   │ ┌──────────────────┐   ┌──────────────────────┐ │
│                   │ │ Telegram    ●   │   │ SMTP auth failed    │ │
│                   │ │ Discord     ●   │   │ Webhook timeout     │ │
│                   │ │ SMTP        ●   │   │ Telegram rate limit │ │
│                   │ └──────────────────┘   └──────────────────────┘ │
│                   │                                                  │
└───────────────────┴──────────────────────────────────────────────────┘
```

---

# 82. Message Detail Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Messages / msg_01J...                                                │
│                                                                      │
│ Production Alert                                      ● Delivered    │
│ Created 2 minutes ago                                                │
│                                                                      │
│ Message                                                              │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Production API is unavailable.                                  │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Deliveries                                                           │
│                                                                      │
│ Telegram Production                                                  │
│ Trading Alerts                                      ● Delivered      │
│ 120 ms                                                               │
│ ──────────────────────────────────────────────────────────────────── │
│ Discord Engineering                                                  │
│ #alerts                                             ● Delivered      │
│ 180 ms                                                               │
│ ──────────────────────────────────────────────────────────────────── │
│ SMTP Production                                                      │
│ admin@example.com                                   ● Failed         │
│ Authentication failed                               [ Retry ]         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 83. Visual Quality Checklist

Before considering a page complete:

```text
[ ] Clear hierarchy
[ ] Primary action obvious
[ ] No unnecessary card nesting
[ ] Empty state exists
[ ] Loading state exists
[ ] Error state exists
[ ] Responsive state exists
[ ] Keyboard focus visible
[ ] Tenant context visible
[ ] Status visually consistent
[ ] Technical IDs copyable
[ ] Sensitive values masked
[ ] Destructive action protected
[ ] Page is not visually overcrowded
```

---

# 84. UX Quality Checklist

For every workflow verify:

```text
Can user understand where they are?

Can user understand what happened?

Can user recover from failure?

Can user find relevant detail without leaving context?

Are technical errors translated into useful messages?

Can the same task be completed without unnecessary page changes?
```

---

# 85. Design Anti-Patterns

Do not use:

```text
dashboard full of cards
nested cards
huge gradients
excessive glass effect
floating decorative objects
large empty hero banners
3D charts
excessive animation
everything rounded excessively
rainbow provider colors
modal for every interaction
separate page for every tiny detail
```

---

# 86. Preferred UX Patterns

Prefer:

```text
tables for operational lists
drawers for detail
modals for creation
inline actions for recovery
tabs for related resource views
filters for operational history
command palette for navigation/actions
subtle real-time status updates
```

---

# 87. Design Principle for Future Features

New features must feel native to Portlane.

Before adding a new page, determine whether it can belong inside an existing domain.

Example:

```text
Provider Health
```

should likely remain under:

```text
Overview / Provider
```

instead of becoming a new sidebar item.

Keep navigation intentionally small.

---

# 88. Final Design Direction

Portlane should visually communicate:

```text
Your communication infrastructure is under control.
```

The interface should feel calm even when handling high-volume operational data.

The best Portlane UI is not the one with the most visual effects.

It is the one where a user can open the dashboard and immediately understand:

```text
Is the system healthy?

Are messages being delivered?

Which provider has a problem?

Why did a delivery fail?

Can I fix it quickly?
```

---

# 89. Final Design Principle

> **Clean by default. Detailed on demand. Interactive where useful. Technical without feeling complicated.**
