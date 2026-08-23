# Bestätigungsmail — Referenzdateien

Diese beiden HTML-Dateien sind Beispiel-Renderings der automatischen
Bestätigungsmail, die `api/contact.js` nach jeder Kontaktformular-Anfrage
an den Absender verschickt (Vorlage: `lib/emailTemplate.js`).

Sie liegen hier als Referenz/Backup und in einem Format, das sich
grundsätzlich in einen E-Mail-Client oder -Dienst importieren lässt
(reines, tabellenbasiertes HTML mit inline Styles).

**Wichtig:** Der eigentliche Betreff, Name und Nachrichtentext im
"Das hast du geschickt"-Kasten sind hier mit Beispieldaten befüllt
(`confirmation-de.html` = "Max Mustermann", `confirmation-en.html` =
"Jane Smith"). Bei jeder echten Anfrage übers Kontaktformular werden
diese Felder dynamisch mit den tatsächlichen Angaben der anfragenden
Person gefüllt — das kann eine statische Datei (z. B. ein klassischer
IONOS-Autoresponder für direkt an das Postfach gesendete Mails) nicht
nachbilden. Für einen solchen Autoresponder wäre daher nur ein fester,
nicht-personalisierter Text möglich, ohne den Kacheln, das Bestätigungs-
Layout und den Empfänger automatisch dynamisch anzupassen.

Logo und Titelbild werden live von soerenblaecker.com geladen
(`/logo.png` bzw. `/api/email-hero`) und aktualisieren sich automatisch,
sobald diese Dateien auf der Seite ausgetauscht werden.
