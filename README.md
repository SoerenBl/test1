# Sören Bläcker — Portfolio-Website

Statische HTML/CSS/JS-Seite, kein Build-Schritt. GitHub → Vercel deployt automatisch bei jedem Push auf `main`.

## Fotos einpflegen

Fotos liegen direkt in dem Ordner, zu dem sie gehören — kein separater Bilder-Ordner, keine zweite Namensliste zum Merken (Ausnahme: die mobile Zusatzversion, siehe unten).

```
hero.jpg                                              → Hero-Foto der Startseite (liegt im Hauptverzeichnis)

kategorien/furniture-lighting/cover.jpg                          → Kachel-Foto dieser Kategorie auf der Startseite (+ Hintergrund der Kategorieseite)
kategorien/furniture-lighting/c-shape-nightstand-de-2018/1.jpg, 2.jpg, ...   → Fotos dieses Projekts

about/about.jpg, about/awards.jpg                     → Hintergrundfotos der About- bzw. Auszeichnungen-Kachel (Desktop; mobil nur about/about.jpg, siehe unten)
services/cover.jpg                                    → Hintergrundfoto der Service-Seite
contact/cover.jpg                                      → Hintergrundfoto der Kontaktseite
logo.png                                                → Logo oben links (liegt im Hauptverzeichnis)
```

Alle sechs Kategorie-Ordner liegen zusammen in `kategorien/` (`kategorien/mobility/`, `kategorien/furniture-lighting/`, `kategorien/product-design/`, `kategorien/craft-restoration/`, `kategorien/interior-design/`, `kategorien/editorial/`) — jede Kategorie- und jede Projektseite hat dort ihren eigenen Ordner (den gibt es im Repository schon, dort liegt die `index.html`), die Fotos kommen einfach mit rein. Eine neue Kategorie ist entsprechend ein neuer Ordner direkt in `kategorien/` (dafür bitte kurz Bescheid geben, siehe unten).

**Projektordner** (`1.jpg`, `2.jpg`, …): komplett dynamisch. Wie viele nummerierte Fotos dort liegen, so viele Kacheln entstehen automatisch auf der Projektseite (max. 24). `1.jpg` ist gleichzeitig das große Hero-Foto oben auf der Projektseite. Lücken in der Nummerierung werden übersprungen. Liegt noch kein Foto vor, zeigt die Seite einen Platzhalter ("Fotos folgen in Kürze").

**`cover.jpg`** (pro Kategorie), **`hero.jpg`**, **`about/about.jpg`**, **`about/awards.jpg`**, **`services/cover.jpg`**, **`contact/cover.jpg`**, **`impressum/cover.jpg`** und **`datenschutz/cover.jpg`** sind je ein festes einzelnes Hintergrundfoto. Fehlt eines davon, zeigt die jeweilige Kachel einen einfachen grauen Platzhalter statt eines Fotos (bei Impressum/Datenschutz: bleibt einfach weiß) — kein Fehler, einfach noch nicht befüllt.

**Foto ändern/hinzufügen:** Datei am passenden Ort ablegen bzw. ersetzen, mit GitHub Desktop committen und pushen. Die Seite zeigt sie automatisch, kein Code muss angepasst werden.

**Neues Projekt** (nicht nur neue Fotos zu einem bestehenden): dafür kurz Bescheid geben — Titel, Kategorie, Land, Jahr — dann lege ich die Seite, den Eintrag in der Kategorie-Liste und den Ordner an.

Bildformat: `.jpg`, `.png` oder `.webp` (auch `.jpeg` bzw. großgeschrieben funktioniert, `.jpg`/`.png`/`.webp` klein ist aber die schnellste Variante), quer oder hochkant funktioniert (die Seite schneidet automatisch passend zu).

### Eigenes Foto nur für die mobile Ansicht

Für jedes der oben genannten festen Hintergrundfotos (Hero, Kategorie-Cover, About/Awards, Service-Cover, Kontakt-Cover) — und auch für ein Projekt-Hero-Foto (`1.jpg`) — kann zusätzlich eine eigene, schmalere (z. B. hochkant fotografierte) Version nur für Handys hinterlegt werden. Das ist reine Kür: ohne mobile Zusatzversion zeigen Handys einfach dasselbe Foto wie der Desktop, genau wie bisher.

Dafür gibt es den Ordner `mobil/` im Hauptverzeichnis — er spiegelt exakt denselben Pfad wie das Originalfoto, nur mit `mobil/` davor:

```
mobil/hero.jpg                                         → mobile Version von hero.jpg
mobil/kategorien/mobility/cover.jpg                     → mobile Version von kategorien/mobility/cover.jpg
mobil/services/cover.jpg                                → mobile Version von services/cover.jpg
mobil/contact/cover.jpg                                 → mobile Version von contact/cover.jpg
mobil/kategorien/mobility/bmw-k100-aero-de-2024/1.jpg   → mobile Version des Projekt-Hero-Fotos dieses Projekts
```

**Sonderfall About/Auszeichnungen:** Auf dem Handy teilen sich beide Abschnitte (About + Auszeichnungen) ein einziges, durchgängiges Hintergrundfoto, ganz ohne Desktop-Gegenstück: `mobil/about/cover.jpg`. `about/about.jpg`/`about/awards.jpg` (die zwei festen Desktop-Fotos oben in der Liste) werden auf dem Handy nicht benutzt — nur noch am Desktop, wo beide Seiten weiterhin als zwei getrennte Vollbild-Panels funktionieren.

**Sonderfall Impressum/Datenschutz:** Diese beiden Seiten haben ein optionales Hintergrundfoto, das über die *gesamte* Seite geht (Titel und der ganze Rechtstext darunter), oben bündig angesetzt und unten abgeschnitten — auf dem Handy genau wie am Desktop. Anders als bei den übrigen Seiten oben ist das Foto hier also nicht nur eine mobile Zusatzversion, sondern ein eigenständiges, festes Hintergrundfoto wie `services/cover.jpg` — plus optional wieder eine eigene mobile Version über `mobil/`:

```
impressum/cover.jpg           → Hintergrundfoto Impressum
datenschutz/cover.jpg         → Hintergrundfoto Datenschutz
mobil/impressum/cover.jpg     → optionale mobile Version davon
mobil/datenschutz/cover.jpg   → optionale mobile Version davon
```

Fehlt das Foto (Desktop-Datei), bleibt die jeweilige Seite einfach weiß — kein Platzhalter, kein Fehler. Die Textfarbe stellt sich automatisch auf das Foto ein (siehe unten) — bei einem sehr langen Rechtstext wird ein hochformatiges Foto aber stark in die Breite beschnitten, je länger die Seite ist; ein ruhiges, eher detailarmes Foto eignet sich hier besser als eines mit einem zentralen Motiv, das darunter leiden würde.

### Automatische Textfarbe (Kontrast) auf Hintergrundfotos

Service-, About/Auszeichnungen-, Kontakt- sowie Impressum/Datenschutz-Hintergrundfotos werden nach dem Laden automatisch auf ihre Helligkeit geprüft und die Schrift entsprechend weiß oder dunkel gestellt — für ein dunkles Foto (wie die bisherigen) bleibt sie weiß, für ein sehr helles Foto schaltet sie automatisch auf dunkel um. Es muss also nichts weiter beachtet werden, welches Foto auch immer hochgeladen wird, es bleibt immer lesbar.

Wichtig beim Anlegen über GitHub im Browser ("Add file" → "Create new file"): dort muss beim Dateinamen ein **Schrägstrich `/`** stehen, kein Doppelpunkt — also `mobil/hero.jpg` eintippen (das legt automatisch den Unterordner an), nicht `mobil:hero.jpg`. Mit einem Doppelpunkt landet die Datei nicht am richtigen Ort und wird nicht gefunden.

Also: gleicher Unterpfad wie das Originalfoto, nur einmal komplett unter `mobil/` gespiegelt. Existiert unter `mobil/...` keine Datei, wird automatisch das normale Foto verwendet — nichts anzulegen ist also immer eine gültige, sichere Option.

## Texte einpflegen

Genau wie bei den Fotos: jede Seite mit editierbarem Text hat ihre eigene `content.txt` (Projektseiten) bzw. `...-content.txt` (die sechs Einzelseiten) direkt neben sich liegen — Titel, Fließtext usw. stehen da einmal auf Deutsch und einmal auf Englisch drin, keine zweite Übersetzung nötig.

```
about-content.txt      → About- und Auszeichnungen-Seite (Titel, Bio-Text, Zeitstrahl, Auszeichnungen)
contact-content.txt    → Kontaktseite (Titel, Untertitel, E-Mail, Telefon, Standort)
home-content.txt       → Startseite (Eyebrow, Titel, Text)
services/content.txt   → Service-Seite (Titel, Untertitel, die drei Leistungsfelder)
impressum/content.txt  → Impressum (alle Pflichtangaben)
datenschutz/content.txt → Datenschutzerklärung (alle Abschnitte)
```

Alle liegen im Hauptverzeichnis bzw. im jeweiligen Seitenordner (also z. B. genau da, wo bei den Kategorien auch die `cover.jpg` liegt). Format: `--- DEUTSCH ---`, dann die Felder als `Feldname: Text`, danach `--- ENGLISH ---` mit denselben Feldern auf Englisch. **Text ändern:** Datei bearbeiten, committen, pushen — GitHub baut die betreffende Seite automatisch neu, kein Code muss angepasst werden. Ändert sich an einer Seite mal etwas Strukturelles (ein neues Feld, ein neuer Abschnitt), sag kurz Bescheid, dann richte ich das entsprechend ein.

**`menu-content.txt`** (Hauptverzeichnis) ist eine Ausnahme: sie listet die Texte des Slide-Menüs (Start/Arbeiten/Service/Über mich/Kontakt, Fußzeile, Impressum/Datenschutz-Links) zum Nachschlagen und für spätere Änderungen — ist aber **noch nicht** an die Automatisierung angeschlossen, das Menü bleibt also unverändert, auch wenn diese Datei bearbeitet wird. Sag Bescheid, wenn sie live geschaltet werden soll.

## Wichtig für Claude (mich)

Diese Datei bei jeder Änderung an Ordnerstruktur, Foto-Namenskonvention oder Automatisierung direkt mit aktualisieren, nicht erst wenn danach gefragt wird.
