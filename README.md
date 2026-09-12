# Sable Airship Suite

An architectural drafting suite and flight ceiling calculator built for **Create: Aeronautics** airships and the **Sable** atmospheric physics library.

---

## Overview

Sable Airship Suite provides an authentic engineering drafting board experience (inspired by 1900s aeronautical blueprints and technical architecture plates) to calculate, balance, and verify the flight ceiling and buoyancy equilibrium of any airship.

### Core Features

- **Architectural Drafting Aesthetic**: Authentic engineering layout featuring drawing title block, scale marks, dimension lines, and drafting registration crosshairs.
- **Three Switchable Themes**:
  - `VELLUM`: Traditional 1900 drafting paper (light cream default).
  - `DARK CAD`: High-contrast neutral monochrome slate/black chalkboard (zero blue tint).
  - `BLUEPRINT`: Classic cyanotype blueprint with luminous cyan line-work.
- **Vessel Photograph Plate (Plate 1)**:
  - Drag and drop image files directly onto the plate.
  - File picker upload.
  - Global `Ctrl+V` clipboard paste support (take a screenshot in-game and paste directly).
- **Blueprint Card Export (PNG)**:
  - Generate an official high-resolution 1200x800 blueprint specification card with one click.
  - Contains vessel photo, full vector forces breakdown, airworthiness certification stamp (`AIRWORTHY` or `OVERWEIGHT`), and official credits for sharing on Discord.
- **Quick Vessel Presets**:
  - `[ SCOUT SKIFF - 450 kpg ]`
  - `[ RECON CORVETTE - 1,200 kpg ]`
  - `[ CARGO ZEPPELIN - 3,500 kpg ]`
  - `[ DREADNOUGHT - 8,500 kpg ]`
- **Instant Configuration Sharing**:
  - Real-time bidirectional URL hash synchronization (`#name=...&m=...&g=...&vol=...&lev=...&dim=...`).
  - One-click copy button with toast notification.
- **Lili's Exact Hermite Spline Engine**:
  - Computes the barometric pressure curve $P(Y)$ across the Overworld piecewise Hermite spline ($Y \in [63, 263]$, $[263, 280]$, $[280, 320]$).
  - Reverse equilibrium bisection down to exact Minecraft integer block levels.
- **Flipped Barometric Profile Diagram**:
  - Collapsible diagram displaying the atmospheric decay with 100% surface pressure on the left and 0% void pressure on the right.

---

## File Structure

```
sable-airship-suite/
├── index.html       # Semantic HTML5 drafting plate structure
├── style.css        # Authentic drafting styles, 3 themes & responsive grid
├── script.js        # Lili's physics engine, canvas renderer & export module
└── README.md        # Technical specification and documentation
```

---

## Deployment & Hosting

### Option 1: GitHub Pages (Free Instant Hosting)
1. In this repository, navigate to **Settings > Pages**.
2. Under **Build and deployment > Branch**, select `main` and root `/`.
3. Click **Save**. The suite will be live at:
   `https://chatdoo.github.io/sable-airship-suite/`

### Option 2: Run Locally
Simply open `index.html` in any modern web browser. Zero dependencies or build steps required.

---

## Authors & Credits

- **Formulas & Physical Logic**: **Lili**
- **Drafting & Frontend Engineering**: [**CHATDOO**](https://github.com/CHATDOO)
- Built for the **Create: Aeronautics** and **Minecraft** airship community.
