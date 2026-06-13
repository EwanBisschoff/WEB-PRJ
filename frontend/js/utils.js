// Gemeinsame Hilfsfunktionen (EasyElectronics Utils)
// Wird von account.js, admin.js und checkout.js verwendet.

/**
 * Richtet die Tab-Navigation ein.
 * Erwartet Elemente mit class="tab-btn" (data-target="panel-id") und class="tab-panel".
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels  = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');

            // Aktiven Button anpassen
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Aktives Panel anpassen
            tabPanels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

/**
 * Richtet das Ein-/Ausblenden des Formulars für eine neue Zahlungsart ein.
 * Erwartet: #btn-toggle-new-pay, #new-payment-form, #btn-save-pay,
 *           #new-provider, #new-details-label, #new-details.
 * @param {Function} onSave - Callback-Funktion zum Speichern der neuen Zahlungsart.
 */
function setupPaymentFormToggle(onSave) {
    const toggleNewPayBtn = document.getElementById('btn-toggle-new-pay');
    const newPayForm      = document.getElementById('new-payment-form');

    if (toggleNewPayBtn && newPayForm) {
        toggleNewPayBtn.addEventListener('click', () => {
            const isVisible = newPayForm.style.display === 'block';
            newPayForm.style.display    = isVisible ? 'none' : 'block';
            toggleNewPayBtn.textContent = isVisible ? '+ Neue Zahlungsart hinzufügen' : 'Abbrechen';
        });
    }

    const savePayBtn = document.getElementById('btn-save-pay');
    if (savePayBtn) {
        savePayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof onSave === 'function') onSave();
        });
    }

    // Label-Text je nach ausgewähltem Anbieter anpassen
    const providerSelect = document.getElementById('new-provider');
    const detailsLabel   = document.getElementById('new-details-label');
    const detailsInput   = document.getElementById('new-details');
    if (providerSelect && detailsLabel && detailsInput) {
        providerSelect.addEventListener('change', () => {
            const val = providerSelect.value;
            if (val === 'PayPal') {
                detailsLabel.textContent = 'PayPal E-Mail-Adresse';
                detailsInput.placeholder = 'beispiel@email.de';
            } else if (val === 'Bankeinzug') {
                detailsLabel.textContent = 'IBAN';
                detailsInput.placeholder = 'DE89 •••• •••• •••• •••• ••';
            } else {
                detailsLabel.textContent = 'Kartennummer (letzte 4 Ziffern)';
                detailsInput.placeholder = 'z. B. •••• 4321';
            }
        });
    }
}

/**
 * Formats a numeric price to German locale string (e.g. "12,99 €").
 * @param {number|string} value
 * @returns {string}
 */
function formatPrice(value) {
    return parseFloat(value).toFixed(2).replace('.', ',') + ' €';
}

/**
 * Formats an ISO date string to a German short datetime string.
 * @param {string} isoDate
 * @returns {string}
 */
function formatOrderDate(isoDate) {
    return new Date(isoDate).toLocaleDateString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
