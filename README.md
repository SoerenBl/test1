# Sören Bläcker — Portfolio-Website

Statische HTML/CSS/JS-Seite, kein Build-Schritt. GitHub → Vercel deployt automatisch bei jedem Push auf `main`.

## Fotos einpflegen

Alle Fotos liegen in einem eigenen Ordner `photos/` im Hauptverzeichnis, getrennt vom Code. Die Struktur folgt genau den Kategorie-/Projektordnern, die es im Repository ohnehin schon gibt:

```
photos/hero.jpg                                  → Hero-Foto der Startseite
photos/{kategorie}/cover.jpg                      → Kachel-Foto dieser Kategorie auf der Startseite
photos/{kategorie}/{projekt}/1.jpg, 2.jpg, ...     → Fotos eines Projekts

Beispiel:
photos/furniture-lighting/cover.jpg
photos/furniture-lighting/c-shape-nightstand/1.jpg
photos/furniture-lighting/c-shape-nightstand/2.jpg
```

Die Kategorie- und Projektnamen sind identisch mit den Ordnernamen, die im Repository für die jeweiligen Seiten stehen (z. B. `furniture-lighting`, `c-shape-nightstand`) — einfach in der Seitenleiste von GitHub Desktop nachschauen, wie eine Seite heißt, und den gleichen Namen unter `photos/` verwenden.

Alle Ordner sind bereits leer angelegt (mit `.gitkeep`) und direkt in Finder/GitHub Desktop sichtbar — einfach Fotos reinziehen, committen, pushen. Die Seite zeigt sie automatisch, kein Code muss angepasst werden.

**Projektordner** (`1.jpg`, `2.jpg`, …): komplett dynamisch. Wie viele nummerierte Fotos dort liegen, so viele Kacheln entstehen automatisch auf der Projektseite (max. 24). `1.jpg` ist gleichzeitig das Vorschaubild in der jeweiligen Kategorie-Liste. Lücken in der Nummerierung werden übersprungen. Liegt noch kein Foto vor, zeigt die Seite einen Platzhalter ("Fotos folgen in Kürze").

**`cover.jpg`** (pro Kategorie) und **`hero.jpg`** sind je ein festes einzelnes Bild.

**Neues Projekt** (nicht nur neue Fotos zu einem bestehenden): dafür kurz Bescheid geben — Titel, Kategorie, Land, Jahr — dann lege ich die Seite, den Eintrag in der Kategorie-Liste und den passenden Foto-Ordner an.

Bildformat: `.jpg`, quer oder hochkant funktioniert (die Seite schneidet automatisch passend zu).
