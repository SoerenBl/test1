# Bestätigungsmail — Referenzdatei für einen IONOS-Autoresponder

Diese beiden HTML-Dateien sind eine **generische, nicht-personalisierte**
Fassung der Bestätigungsmail-Optik (Vorlage: `lib/emailTemplate.js`,
Modus `static`). Gedacht als fertige Datei, falls IONOS eine Funktion
anbietet, direkt an die Mailbox gesendete Anfragen (am Kontaktformular
vorbei) automatisch zu beantworten.

Anders als die Bestätigungsmail, die `api/contact.js` nach einer echten
Kontaktformular-Anfrage verschickt, enthalten diese Dateien **keine
Anrede mit Namen** und **keinen "Das hast du geschickt"-Kasten** mehr:
Ein klassischer, statischer Autoresponder weiß nicht, wer geschrieben
hat oder was in der Mail stand, kann diese Felder also nicht befüllen.
Deshalb nur "Hallo," ohne Namen, und kein Rückblick auf Betreff/
Nachricht — alles andere (Titelfoto, Logo, Fließtext, Kontaktdaten,
rechtliche Links) bleibt gleich.

Logo und Titelbild werden live von soerenblaecker.com geladen
(`/logo.png` bzw. `/api/email-hero`) und aktualisieren sich automatisch,
sobald diese Dateien auf der Seite ausgetauscht werden — das gilt auch,
wenn diese Datei unverändert in IONOS hochgeladen wird, solange IONOS
externe Bilder beim Öffnen der Mail nachlädt.
