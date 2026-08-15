# Sören Bläcker — Portfolio-Website

Statische HTML/CSS/JS-Seite, kein Build-Schritt. GitHub → Vercel deployt automatisch bei jedem Push auf `main`.

## Fotos einpflegen

Alle Fotos liegen in einem eigenen Ordner `Fotos/` im Hauptverzeichnis, getrennt vom Code. Die Struktur:

```
Fotos/
├── Titelbilder/
│   ├── Mainpage_Titelbild/hero.jpg          → Hero-Foto der Startseite
│   ├── MOBILITY_AUTOMOTIVE/cover.jpg        → Kachel-Foto dieser Kategorie auf der Startseite
│   ├── FURNITURE_LIGHTING/cover.jpg
│   ├── PRODUCT_INDUSTRIAL_DESIGN/cover.jpg
│   ├── INTERIOR_SPATIAL_DESIGN/cover.jpg
│   ├── CRAFT_RESTORATION/cover.jpg
│   └── EDITORIAL_DESIGN/cover.jpg
│
├── MOBILITY_AUTOMOTIVE/
│   ├── BMW_K100_Aero/1.jpg, 2.jpg, ...
│   └── Legno_Veloce/1.jpg, 2.jpg, ...
│
├── FURNITURE_LIGHTING/
│   ├── Nightstands/{C-Shape_Floating, Scandinavian_Tech, Solid_Oak, Anthracite_Oak_Craft, Walnut_Anthracite, White_MPX_Bedroom_Series}/1.jpg, ...
│   ├── HiFi_Sideboards/{Yamaha_Compact_HiFi, Retro_Modern_HiFi_Gesellenstueck}/1.jpg, ...
│   ├── Tables/{Tisch_Eiche, Tisch_Kirsche}/1.jpg, ...
│   └── Lighting/Lamp_Concept/1.jpg, ...
│
├── PRODUCT_INDUSTRIAL_DESIGN/{Remissus, Cerachron, Axe_and_Saw_Tool, Concept_Audio_Speaker, Unfinished_Concepts}/1.jpg, ...
├── INTERIOR_SPATIAL_DESIGN/{Minimalist_Oak_Bathroom, Mobile_Spatial_Bookshelf}/1.jpg, ...
├── CRAFT_RESTORATION/Vintage_Bicycle_Restorations/1.jpg, ...
└── EDITORIAL_DESIGN/Editorial_and_Print_Works/1.jpg, ...
```

Alle Ordner sind bereits angelegt (leer, mit `.gitkeep`) — einfach Fotos reinziehen, mit GitHub Desktop committen und pushen. Die Seite zeigt sie automatisch, kein Code muss angepasst werden.

**Projektordner** (`1.jpg`, `2.jpg`, …): komplett dynamisch. Wie viele nummerierte Fotos dort liegen, so viele Kacheln entstehen automatisch auf der Projektseite (max. 24). `1.jpg` ist gleichzeitig das Vorschaubild in der jeweiligen Kategorie-Liste. Lücken in der Nummerierung werden übersprungen. Liegt noch kein Foto vor, zeigt die Seite einen Platzhalter ("Fotos folgen in Kürze").

**`cover.jpg`** (unter Titelbilder, pro Kategorie) und **`hero.jpg`** (Mainpage_Titelbild) sind je ein festes einzelnes Bild.

**Neues Projekt** (nicht nur neue Fotos zu einem bestehenden): dafür kurz Bescheid geben — Titel, Kategorie, Land, Jahr — dann lege ich die Seite, den Eintrag in der Kategorie-Liste und den passenden Foto-Ordner an.

Bildformat: `.jpg`, quer oder hochkant funktioniert (die Seite schneidet automatisch passend zu).
