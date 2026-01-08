// Initialize after DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    console.log('reservation-emailjs.js loaded');
    console.log('emailjs object before init:', typeof emailjs !== 'undefined' ? emailjs : 'undefined');
    emailjs.init("hB67gvSWDEIYZe80n");
    console.log('emailjs initialized');

    const form = document.getElementById("reservationForm");
    if (!form) {
        console.error('reservationForm not found in DOM');
        return;
    }

    // Validate date/time input: disallow Sunday(0) and Monday(1), and times before 09:30 or after 18:00
    const dateInput = form.querySelector('input[name="date"]');
    if (dateInput) {
        // helper: returns minutes since midnight
        function minutesOf(d) {
            return d.getHours() * 60 + d.getMinutes();
        }

        function validateDateTime() {
            const val = dateInput.value;
            if (!val) {
                dateInput.setCustomValidity('');
                return true;
            }

            const d = new Date(val);
            const day = d.getDay(); // 0 = Sunday, 1 = Monday
            const mins = minutesOf(d);
            const minAllowed = 9 * 60 + 30; // 09:30
            const maxAllowed = 18 * 60; // 18:00
            const noonStart = 12 * 60; // 12:00
            const noonEnd = 14 * 60; // 14:00

            if (day === 0 || day === 1) {
                dateInput.setCustomValidity('Les réservations ne sont pas possibles le dimanche et le lundi.');
                return false;
            }

            if (mins >= noonStart && mins < noonEnd) {
                dateInput.setCustomValidity('Les réservations ne sont pas possibles entre 12:00 et 14:00.');
                return false;
            }

            if (mins < minAllowed || mins > maxAllowed) {
                dateInput.setCustomValidity('Heure hors plage autorisée (09:30 - 18:00).');
                return false;
            }

            dateInput.setCustomValidity('');
            return true;
        }

        dateInput.addEventListener('input', validateDateTime);
        dateInput.addEventListener('change', validateDateTime);
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        function toUTCICS(date) {
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            const hh = String(date.getUTCHours()).padStart(2, '0');
            const mm = String(date.getUTCMinutes()).padStart(2, '0');
            const ss = String(date.getUTCSeconds()).padStart(2, '0');
            return `${y}${m}${d}T${hh}${mm}${ss}Z`;
        }

        const nom = this.nom.value;
        const prenom = this.prenom.value;
        const email = this.email.value;
        const dateValue = this.date.value; // e.g. "2026-01-08T14:30"
        const message = this.message.value || '';
        const forfait = (this.querySelector('input[name="forfait"]:checked') || {}).value || '';

        let eventLink = '';
        let icsDataUrl = '';
        let eventDate = '';
        if (dateValue) {
            const start = new Date(dateValue);
            const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour

            const startUTC = toUTCICS(start);
            const endUTC = toUTCICS(end);

            const title = `Réservation Tricot - ${prenom} ${nom}`;
            const details = message;
            const location = 'Boutique Madame Tricote';

            // Google Calendar link
            eventLink = 'https://www.google.com/calendar/render?action=TEMPLATE'
                + '&text=' + encodeURIComponent(title)
                + '&dates=' + encodeURIComponent(startUTC + '/' + endUTC)
                + '&details=' + encodeURIComponent(details)
                + '&location=' + encodeURIComponent(location)
                + '&sf=true&output=xml';

            // ICS content and data URL (for download/add to other calendars)
            const uid = Date.now() + '@madametricote';
            const dtstamp = toUTCICS(new Date());
            const ics = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Madame Tricote//FR',
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART:${startUTC}`,
                `DTEND:${endUTC}`,
                `SUMMARY:${title}`,
                `DESCRIPTION:${details}`,
                `LOCATION:${location}`,
                'END:VEVENT',
                'END:VCALENDAR'
            ].join('\r\n');

            icsDataUrl = 'data:text/calendar;charset=utf8,' + encodeURIComponent(ics);

            // Outlook web compose link (local datetime)
            function formatLocalForOutlook(d) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                const mm = String(d.getMinutes()).padStart(2, '0');
                return `${y}-${m}-${day}T${hh}:${mm}:00`;
            }

            const outlookLink = 'https://outlook.live.com/owa/?path=/calendar/action/compose'
                + '&subject=' + encodeURIComponent(title)
                + '&startdt=' + encodeURIComponent(formatLocalForOutlook(start))
                + '&enddt=' + encodeURIComponent(formatLocalForOutlook(end))
                + '&body=' + encodeURIComponent(details)
                + '&location=' + encodeURIComponent(location);

            // expose Outlook link as `eventDate` field for template
            eventDate = outlookLink;

            // populate hidden anchor and hidden input in the page (kept invisible)
            try {
                const eventAnchor = document.getElementById('eventDateAnchor');
                const eventInput = document.getElementById('eventDateInput');
                if (eventAnchor) {
                    eventAnchor.href = eventDate;
                    eventAnchor.textContent = 'Ajouter à mon calendrier';
                }
                if (eventInput) {
                    eventInput.value = eventDate;
                }
            } catch (err) {
                console.warn('Could not set eventDate DOM elements:', err);
            }
        }

        // build data and calendar links (from earlier patch)
        // ...

        const formData = {
            nom: nom,
            prenom: prenom,
            email: email,
            date: dateValue,
            message: message,
            forfait: forfait,
            event_link: eventLink,
            ics_link: icsDataUrl,
            eventDate: eventDate || '',
            // HTML-ready anchor to include directly in EmailJS template
            eventDateHtml: eventDate ? `<a href="${eventDate}" target="_blank" rel="noopener">Ajouter à mon calendrier Outlook</a>` : ''
        };

        console.log('Prepared formData:', formData);

        emailjs.send("service_yl0kh3m", "template_cl6bc7u", formData)
            .then((resp) => {
                console.log('EmailJS send success:', resp);
                alert("Réservation envoyée automatiquement au gérant !");
                form.reset();
            })
            .catch((error) => {
                console.error("Erreur EmailJS :", error);
                alert("Erreur lors de l'envoi, réessayez.");
            });
    });
});

