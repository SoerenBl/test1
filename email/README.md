# E-Mail-Texte

`content.txt` in diesem Ordner steuert alle Texte in den beiden
automatischen E-Mails (Bestätigungsmail an den Absender, Benachrichtigung
an dich). Einfach die Datei öffnen, Text hinter dem jeweiligen
Doppelpunkt ändern, speichern, per GitHub Desktop committen und pushen —
kein weiterer Schritt nötig, die nächste E-Mail nutzt automatisch den
neuen Text. Genau wie bei `about-content.txt` o. ä. auf der Webseite
selbst.

Falls die Datei mal fehlt, kaputt ist oder ein Schlüssel fehlt: das
System fällt automatisch auf den zuletzt bekannten Text zurück, es geht
also nichts kaputt, wenn beim Bearbeiten mal ein Tippfehler im Format
passiert (z. B. der Doppelpunkt fehlt in einer Zeile) — die betroffene
Zeile wird dann einfach ignoriert.

## Was hier NICHT drinsteht (und warum)

Diese Dinge stecken im Code, nicht in der Textdatei, weil sie entweder
technisch heikel sind (E-Mail-HTML ist sehr viel zerbrechlicher als eine
Webseite — Outlook z. B. kann kein modernes CSS) oder weil sie ohnehin
automatisch von der Webseite übernommen werden. Liste zur Info — meld
dich einfach, wenn du an einem der Punkte etwas geändert haben willst:

- **Titelbild (Foto oben in der Mail):** wird automatisch aus dem
  aktuellen `hero.jpg` der Webseite erzeugt und zurechtgeschnitten
  (1200×521px). Änderst du `hero.jpg` auf der Webseite, ändert sich das
  Mail-Titelbild beim nächsten Versand automatisch mit — kein
  eigenständiges Bild zum Ersetzen nötig.
- **Logo:** `logo-white.png` im Hauptordner (weiße Version, weil es
  direkt auf dem Foto liegt). Ersetzen = neue Datei mit demselben
  Namen hochladen.
- **Schriftart:** dieselbe Kombination wie auf der Webseite — „Anton"
  für die große Überschrift, Helvetica/Arial für den Fließtext. Bewusst
  identisch zur Webseite gehalten (Wiedererkennung); eine E-Mail kann
  aber nicht beliebige Schriften laden wie eine Webseite — die meisten
  Mail-Programme zeigen ohnehin nur eine Ersatzschrift (Arial/Helvetica)
  an, nur Apple Mail zeigt „Anton" wirklich.
- **Farben:** dunkler Hintergrund (fast Schwarz, `#1c1b1f` / `#2b2a30`),
  weißer Text, das „Glaskachel"-Feld mit orange/lila Farbakzenten in den
  Ecken — bewusst eigenständiges Dunkel-Design für die Mail, nicht
  exakt die Webseiten-Blautöne (`#1e6fa8`). War eine bewusste
  Design-Entscheidung von uns; sag Bescheid, falls du das doch näher an
  die Webseitenfarben angleichen willst.
- **Layout/Aufbau** (Tabellen-Struktur, was worüber steht): fest im Code
  (`lib/emailTemplate.js`), weil E-Mail-Postfächer (v. a. Outlook)
  moderne Layout-Technik nicht unterstützen — das lässt sich nicht
  gefahrlos per Textdatei ändern, ohne die Darstellung in manchen
  Postfächern zu zerschießen.
- **Betreffzeilen-Präfix bei der Benachrichtigung an dich**
  (`[Kontaktformular] ...`): steckt in `api/contact.js`, nicht in dieser
  Textdatei, weil es dort automatisch mit dem Betreff des Formulars
  zusammengesetzt wird.
