// Registrierungs-Controller (EasyElectronics)

document.addEventListener("DOMContentLoaded", () => {
    const providerSelect = document.getElementById('payment_provider');
    const detailsLabel = document.getElementById('payment_details_label');
    const detailsInput = document.getElementById('payment_details');

    if (providerSelect && detailsLabel && detailsInput) {
        providerSelect.addEventListener('change', () => {
            const val = providerSelect.value;
            if (val === 'PayPal') {
                detailsLabel.textContent = 'PayPal E-Mail-Adresse';
                detailsInput.placeholder = 'name@beispiel.de';
                detailsInput.type = 'email';
            } else {
                detailsLabel.textContent = val === 'MasterCard' ? 'MasterCard Kartennummer' : 'Visa Kartennummer';
                detailsInput.placeholder = 'z. B. 4500 1234 5678 9012';
                detailsInput.type = 'text';
            }
        });
    }
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const password2 = document.getElementById('password2').value;

    // 1. Client-seitige Passwort-Validierung (2-fache Eingabe auf Übereinstimmung prüfen)
    if (password !== password2) {
        alert('Die Passwörter stimmen nicht überein.');
        return;
    }

    if (password.length < 6) {
        alert('Das Passwort muss mindestens 6 Zeichen lang sein.');
        return;
    }

    // 2. Daten sammeln (inkl. Anrede, Adresse, PLZ, Ort und Zahlungsinformationen)
    const data = {
        salutation: document.getElementById('salutation').value,
        firstname: document.getElementById('firstname').value.trim(),
        lastname: document.getElementById('lastname').value.trim(),
        address: document.getElementById('address').value.trim(),
        zip: document.getElementById('zip').value.trim(),
        city: document.getElementById('city').value.trim(),
        email: document.getElementById('email').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: password,
        payment_provider: document.getElementById('payment_provider').value,
        payment_details: document.getElementById('payment_details').value.trim()
    };

    // 3. Zusätzliche Validierungen
    if (data.payment_provider === 'PayPal') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.payment_details)) {
            alert('Bitte geben Sie eine gültige PayPal E-Mail-Adresse ein.');
            return;
        }
    }

    // 4. API Request absetzen
    fetch('../backend/api/register.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Registrierung fehlgeschlagen'); });
        }
        return response.json();
    })
    .then(result => {
        alert(result.message);
        window.location.href = 'login.html';
    })
    .catch(err => {
        console.error("Registrierungsfehler:", err);
        const statusDiv = document.getElementById('status');
        if (statusDiv) {
            statusDiv.textContent = err.message;
            statusDiv.style.color = 'var(--danger-color)';
        }
    });
});