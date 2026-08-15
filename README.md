# Sören Bläcker — Portfolio-Website

Statische HTML/CSS/JS-Seite, kein Build-Schritt. GitHub → Vercel deployt automatisch bei jedem Push auf `main`.

## Fotos einpflegen

Fotos liegen direkt in dem Ordner, zu dem sie gehören — kein separater Bilder-Ordner, keine zweite Namensliste zum Merken.

```
hero.jpg                                  → Hero-Foto der Startseite (liegt im Hauptverzeichnis)

furniture-lighting/cover.jpg              → Kachel-Foto dieser Kategorie auf der Startseite
furniture-lighting/c-shape-nightstand/1.jpg, 2.jpg, ...   → Fotos dieses Projekts
```

Jede Kategorie- und jede Projektseite hat also ihren eigenen Ordner (den gibt es im Repository schon, dort liegt die `index.html`) — die Fotos kommen einfach mit rein.

**Projektordner** (`1.jpg`, `2.jpg`, …): komplett dynamisch. Wie viele nummerierte Fotos dort liegen, so viele Kacheln entstehen automatisch auf der Projektseite (max. 24). `1.jpg` ist gleichzeitig das Vorschaubild in der jeweiligen Kategorie-Liste. Lücken in der Nummerierung werden übersprungen. Liegt noch kein Foto vor, zeigt die Seite einen Platzhalter ("Fotos folgen in Kürze").

**`cover.jpg`** (pro Kategorie) und **`hero.jpg`** sind je ein festes einzelnes Bild.

**Foto ändern/hinzufügen:** Datei am passenden Ort ablegen bzw. ersetzen, mit GitHub Desktop committen und pushen. Die Seite zeigt sie automatisch, kein Code muss angepasst werden.

**Neues Projekt** (nicht nur neue Fotos zu einem bestehenden): dafür kurz Bescheid geben — Titel, Kategorie, Land, Jahr — dann lege ich die Seite, den Eintrag in der Kategorie-Liste und den Ordner an.

Bildformat: `.jpg`, quer oder hochkant funktioniert (die Seite schneidet automatisch passend zu).
