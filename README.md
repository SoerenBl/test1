# Sören Bläcker — Portfolio-Website

Statische HTML/CSS/JS-Seite, kein Build-Schritt. GitHub → Vercel deployt automatisch bei jedem Push auf `main`.

## Fotos einpflegen

Fotos liegen direkt neben der Seite, zu der sie gehören — kein separater Bilder-Ordner. Die Zahl im Dateinamen bestimmt die Reihenfolge auf der Seite.

```
index.html                              → Startseite
hero.jpg                                → Hero-Foto auf der Startseite

furniture-lighting/index.html           → Kategorieseite "Möbel & Beleuchtung"
furniture-lighting/cover.jpg            → Kachel-Foto dieser Kategorie auf der Startseite

furniture-lighting/c-shape-nightstand/index.html   → Projektseite
furniture-lighting/c-shape-nightstand/1.jpg        → 1. Foto (auch das Vorschaubild in der Kategorie-Liste)
furniture-lighting/c-shape-nightstand/2.jpg        → 2. Foto
furniture-lighting/c-shape-nightstand/3.jpg        → 3. Foto
```

**Foto ändern/hinzufügen:** Datei am passenden Pfad ablegen bzw. ersetzen, mit GitHub Desktop committen und pushen — die Seite zeigt sie automatisch, kein Code muss angepasst werden.

Auf einer **Projektseite** ist die Foto-Galerie komplett dynamisch: beliebig viele `1.jpg`, `2.jpg`, `3.jpg`, … — wie viele Dateien du ablegst, so viele Kacheln entstehen automatisch (max. 24). Lücken in der Nummerierung werden einfach übersprungen. Liegt noch gar kein Foto vor, zeigt die Seite einen Platzhalter ("Fotos folgen in Kürze").

`cover.jpg` (Kategorie) und `hero.jpg` (Startseite) sind jeweils ein festes einzelnes Bild.

**Neues Projekt** (nicht nur neue Fotos zu einem bestehenden): dafür kurz Bescheid geben — Titel, Kategorie, Land, Jahr — dann lege ich die Seite und den Eintrag in der Kategorie-Liste an.

Bildformat: `.jpg`, quer oder hochkant funktioniert (die Seite schneidet automatisch passend zu).
