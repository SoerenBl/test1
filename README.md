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

**Foto ändern/hinzufügen:** Datei am passenden Pfad ersetzen bzw. ablegen (gleicher Dateiname wie vorgesehen, z. B. `2.jpg`), mit GitHub Desktop committen und pushen — die Seite zeigt sie automatisch, kein Code muss angepasst werden. Solange an einem Pfad noch kein Foto liegt, zeigt die Seite dort weiterhin den Platzhalter.

Jedes Projekt hat aktuell 3 Foto-Plätze (`1.jpg`–`3.jpg`). Braucht ein einzelnes Projekt mehr, kurz Bescheid geben — dafür muss die jeweilige `index.html` einmalig um einen weiteren Foto-Slot ergänzt werden.

Bildformat: `.jpg`, quer oder hochkant funktioniert (die Seite schneidet automatisch passend zu).
