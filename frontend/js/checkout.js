// Kassenseite Controller (EasyElectronics)

document.addEventListener("DOMContentLoaded", () => {
    // 1. Authentifizierungs-Check beim Laden der Seite
    checkAuthentication();

    // 2. Event-Listener für Gutschein-Button
    const applyVoucherBtn = document.getElementById('btn-apply-voucher');
    if (applyVoucherBtn) {
        applyVoucherBtn.addEventListener('click', () => {
            applyVoucher();
        });
    }

    // 3. Event-Listener für Bestellabschluss-Button
    const submitOrderBtn = document.getElementById('btn-submit-order');
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', () => {
            submitOrder();
        });
    }

    // 4. Formular für neue Zahlungsart ein-/ausblenden
    const toggleNewPayBtn = document.getElementById('btn-toggle-new-pay');
    const newPayForm = document.getElementById('new-payment-form');
    if (toggleNewPayBtn && newPayForm) {
        toggleNewPayBtn.addEventListener('click', () => {
            const isVisible = newPayForm.style.display === 'block';
            newPayForm.style.display = isVisible ? 'none' : 'block';
            toggleNewPayBtn.textContent = isVisible ? '+ Neue Zahlungsart hinzufügen' : 'Abbrechen';
        });
    }

    // 5. Neue Zahlungsart speichern
    const savePayBtn = document.getElementById('btn-save-pay');
    if (savePayBtn) {
        savePayBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveNewPaymentMethod();
        });
    }

    // 6. Label-Text je nach ausgewähltem Anbieter anpassen
    const providerSelect = document.getElementById('new-provider');
    const detailsLabel = document.getElementById('new-details-label');
    const detailsInput = document.getElementById('new-details');
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
});

// Lokale Variablen zur Verfolgung des Kassen-Status
let cartData = null;
let savedPaymentMethods = [];
let selectedPaymentMethodId = null;
let appliedVoucher = null; // Speichert Berechnungsergebnisse des Gutscheins

// Überprüfen, ob der Benutzer angemeldet ist
function checkAuthentication() {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(session => {
            if (!session.loggedIn) {
                // Wenn nicht angemeldet, zurück zum Login mit Weiterleitungsparameter
                alert("Bitte melden Sie sich an, um zur Kasse zu gelangen.");
                window.location.href = 'login.html?redirect=checkout.html';
            } else {
                // Wenn angemeldet, Warenkorb und Zahlungsarten laden
                loadCheckoutDetails();
            }
        })
        .catch(err => {
            console.error("Authentifizierungsprüfung fehlgeschlagen:", err);
            window.location.href = 'login.html';
        });
}

// Warenkorb und Zahlungsarten parallel abrufen
function loadCheckoutDetails() {
    // Warenkorb abrufen
    fetch('../backend/api/cart.php')
        .then(res => res.json())
        .then(cart => {
            if (!cart.items || cart.items.length === 0) {
                alert("Ihr Warenkorb ist leer. Sie werden zum Warenkorb weitergeleitet.");
                window.location.href = 'cart.html';
                return;
            }
            cartData = cart;
            renderOrderSummary();
            
            // Erst wenn der Warenkorb geladen ist, rufen wir die Zahlungsarten ab
            loadPaymentMethods();
        })
        .catch(err => console.error("Fehler beim Laden des Warenkorbs:", err));
}

// Stored Payment Methods abrufen
function loadPaymentMethods() {
    fetch('../backend/api/payment_methods.php')
        .then(res => res.json())
        .then(methods => {
            savedPaymentMethods = methods;
            renderPaymentMethods();
        })
        .catch(err => console.error("Fehler beim Laden der Zahlungsarten:", err));
}

// Stored Payment Methods im UI rendern
function renderPaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;

    if (savedPaymentMethods.length === 0) {
        container.innerHTML = `
            <p style="color: var(--danger-color); font-weight: 500;">
                Keine gespeicherten Zahlungsarten gefunden. Bitte fügen Sie unten eine neue hinzu!
            </p>
        `;
        selectedPaymentMethodId = null;
        return;
    }

    container.innerHTML = '';
    savedPaymentMethods.forEach((method, index) => {
        const option = document.createElement('div');
        option.className = 'payment-option';
        option.id = `pay-option-${method.id}`;
        
        // Erste Methode standardmäßig vorauswählen
        const isChecked = index === 0;
        if (isChecked && !selectedPaymentMethodId) {
            selectedPaymentMethodId = method.id;
            option.classList.add('selected');
        } else if (selectedPaymentMethodId === method.id) {
            option.classList.add('selected');
        }

        // SVG Icons passend zum Anbieter
        let providerIcon = '';
        if (method.provider === 'Visa') {
            providerIcon = '💳';
        } else if (method.provider === 'PayPal') {
            providerIcon = '🅿️';
        } else {
            providerIcon = '💵';
        }

        option.innerHTML = `
            <input type="radio" name="payment_method" value="${method.id}" ${isChecked || selectedPaymentMethodId === method.id ? 'checked' : ''}>
            <div class="payment-info">
                <span class="payment-provider">${providerIcon} ${method.provider}</span>
                <span class="payment-details">${method.details}</span>
            </div>
        `;

        // Klick auf gesamte Zeile selektiert Radio
        option.addEventListener('click', () => {
            selectPaymentMethod(method.id);
        });

        container.appendChild(option);
    });
}

// Eine Zahlungsart selektieren
function selectPaymentMethod(id) {
    selectedPaymentMethodId = id;
    
    // UI aktualisieren (Klassen anpassen)
    const options = document.querySelectorAll('.payment-option');
    options.forEach(opt => opt.classList.remove('selected'));
    
    const selectedOpt = document.getElementById(`pay-option-${id}`);
    if (selectedOpt) {
        selectedOpt.classList.add('selected');
        const radio = selectedOpt.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }
}

// Neue Zahlungsart speichern (AJAX POST)
function saveNewPaymentMethod() {
    const provider = document.getElementById('new-provider').value;
    const details = document.getElementById('new-details').value.trim();

    if (!details) {
        alert("Bitte füllen Sie die Details zur Zahlungsart aus.");
        return;
    }

    fetch('../backend/api/payment_methods.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider, details })
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            alert("Fehler: " + result.error);
        } else {
            alert(result.message);
            // Formular zurücksetzen & schließen
            document.getElementById('new-details').value = '';
            document.getElementById('new-payment-form').style.display = 'none';
            document.getElementById('btn-toggle-new-pay').textContent = '+ Neue Zahlungsart hinzufügen';
            
            // Zahlungsart vorauswählen
            selectedPaymentMethodId = result.payment_method.id;
            
            // Neu laden
            loadPaymentMethods();
        }
    })
    .catch(err => console.error("Fehler beim Hinzufügen der Zahlungsart:", err));
}

// Gutschein einlösen (AJAX POST)
function applyVoucher() {
    const codeInput = document.getElementById('voucher-code');
    const messageContainer = document.getElementById('voucher-message');
    
    if (!codeInput || !messageContainer) return;
    
    const code = codeInput.value.trim();
    if (!code) {
        alert("Bitte geben Sie einen Gutscheincode ein.");
        return;
    }

    fetch('../backend/api/vouchers.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: code,
            total_price: cartData.grand_total
        })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error); });
        }
        return res.json();
    })
    .then(result => {
        appliedVoucher = result;
        
        // Nachricht für Erfolg anzeigen
        messageContainer.innerHTML = `
            <div class="badge-voucher">
                Gutschein <strong>${result.voucher.code}</strong> angewendet: -${parseFloat(result.calculation.discount).toFixed(2).replace('.', ',')} €
            </div>
        `;
        messageContainer.style.color = "var(--success-color)";
        
        // Bestellübersicht aktualisieren
        renderOrderSummary();
    })
    .catch(err => {
        appliedVoucher = null;
        messageContainer.textContent = "Fehler: " + err.message;
        messageContainer.style.color = "var(--danger-color)";
        
        // Bestellübersicht aktualisieren (falls Gutschein ungültig gemacht wurde)
        renderOrderSummary();
    });
}

// Bestellübersicht rendern (inkl. Produkte und Berechnungen)
function renderOrderSummary() {
    if (!cartData) return;

    const itemsContainer = document.getElementById('checkout-items');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        cartData.items.forEach(item => {
            const itemRow = document.createElement('div');
            itemRow.className = 'checkout-item-mini';
            itemRow.innerHTML = `
                <span class="checkout-item-name">${item.name}</span>
                <span class="checkout-item-qty">x ${item.quantity}</span>
                <span class="checkout-item-price">${parseFloat(item.line_total).toFixed(2).replace('.', ',')} €</span>
            `;
            itemsContainer.appendChild(itemRow);
        });
    }

    // Werte berechnen
    let subtotal = cartData.subtotal;
    let discount = 0.0;
    let total = cartData.grand_total;

    const discountRow = document.getElementById('summary-discount-row');
    const discountVal = document.getElementById('summary-discount');

    if (appliedVoucher) {
        discount = appliedVoucher.calculation.discount;
        total = appliedVoucher.calculation.final_total;
        
        if (discountRow && discountVal) {
            discountRow.style.display = 'flex';
            discountVal.textContent = `-${parseFloat(discount).toFixed(2).replace('.', ',')} €`;
        }
    } else {
        if (discountRow) discountRow.style.display = 'none';
    }

    // UI-Elemente füllen
    document.getElementById('summary-subtotal').textContent = parseFloat(subtotal).toFixed(2).replace('.', ',') + ' €';
    document.getElementById('summary-total').textContent = parseFloat(total).toFixed(2).replace('.', ',') + ' €';
}

// Bestellung absenden (AJAX POST)
function submitOrder() {
    if (!selectedPaymentMethodId) {
        alert("Bitte wählen Sie zuerst eine Zahlungsart aus.");
        return;
    }

    const payload = {
        payment_method_id: selectedPaymentMethodId,
        voucher_code: appliedVoucher ? appliedVoucher.voucher.code : ''
    };

    fetch('../backend/api/checkout.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error); });
        }
        return res.json();
    })
    .then(result => {
        // Erfolgs-Overlay anzeigen
        document.getElementById('success-order-id').textContent = result.order_id;
        
        // Überprüfen, ob es einen Restwert auf dem Gutschein gibt
        const residualInfo = document.getElementById('voucher-residual-info');
        if (appliedVoucher && parseFloat(appliedVoucher.calculation.remaining_voucher_value) > 0) {
            const restwert = parseFloat(appliedVoucher.calculation.remaining_voucher_value).toFixed(2).replace('.', ',');
            residualInfo.style.display = 'block';
            residualInfo.innerHTML = `
                <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid var(--primary-color); border-radius: 12px; padding: 15px; color: var(--text-primary);">
                    ℹ️ Ihr Gutschein <strong>${appliedVoucher.voucher.code}</strong> hat noch einen Restwert von <strong>${restwert} €</strong> für Ihren nächsten Einkauf!
                </div>
            `;
        } else {
            residualInfo.style.display = 'none';
        }
        
        // Badge zurücksetzen
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge(0);
        }

        // Overlay anzeigen
        document.getElementById('success-overlay').style.display = 'flex';
    })
    .catch(err => {
        console.error("Bestellabschluss fehlgeschlagen:", err);
        alert("Bestellfehler: " + err.message);
    });
}
