// Kundenkonto Dashboard Controller (EasyElectronics)

document.addEventListener("DOMContentLoaded", () => {
    // 1. Authentifizierungsprüfung beim Laden der Seite
    checkAuthentication();

    // 2. Tab-Navigation einrichten (utils.js)
    setupTabs();

    // 3. Formular-Events binden
    setupForms();
});

// Anmelde-Verifizierung
function checkAuthentication() {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(({ loggedIn }) => {
            if (!loggedIn) {
                // Wenn nicht angemeldet, zum Login weiterleiten
                alert("Bitte melden Sie sich an, um Ihr Kundenkonto zu verwalten.");
                window.location.href = 'login.html';
            } else {
                // Wenn angemeldet, Initialdaten laden
                loadUserProfile();
                loadPaymentMethods();
                loadOrderHistory();
            }
        })
        .catch(err => {
            console.error("Fehler bei Authentifizierungsprüfung:", err);
            window.location.href = 'login.html';
        });
}

function loadUserProfile() {
    fetch('../backend/api/user.php')
        .then(res => {
            if (!res.ok) throw new Error("Fehler beim Abrufen des Benutzerprofils");
            return res.json();
        })
        .then(user => {
            document.getElementById('profile-salutation').value = user.salutation || 'Herr';
            document.getElementById('profile-firstname').value  = user.firstname  || '';
            document.getElementById('profile-lastname').value   = user.lastname   || '';
            document.getElementById('profile-address').value   = user.address    || '';
            document.getElementById('profile-zip').value       = user.zip        || '';
            document.getElementById('profile-city').value      = user.city       || '';
            document.getElementById('profile-email').value     = user.email      || '';
            document.getElementById('profile-username').value  = user.username   || '';
        })
        .catch(err => console.error(err));
}

// --- Payment helpers ----------------------------------------------------------

/** Returns an emoji icon for a given payment provider string. */
function getPaymentIcon(provider) {
    if (provider === 'Visa' || provider === 'MasterCard') return '💳';
    if (provider === 'PayPal') return '🅿️';
    return '💵';
}

// Zahlungsarten verwalten (Laden, Hinzufügen, Löschen)
function loadPaymentMethods() {
    const container = document.getElementById('payment-list-container');
    if (!container) return;

    fetch('../backend/api/payment_methods.php')
        .then(res => res.json())
        .then(methods => {
            if (methods.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted);">Keine gespeicherten Zahlungsarten vorhanden.</p>`;
                return;
            }

            container.innerHTML = '';
            methods.forEach(method => {
                const item = document.createElement('div');
                item.className = 'payment-item';

                const icon = getPaymentIcon(method.provider);

                item.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-primary);">${icon} ${method.provider}</span>
                        <span style="font-size: 0.85rem; color: var(--text-muted);">${method.details}</span>
                    </div>
                    <button class="btn btn-delete" data-id="${method.id}" aria-label="Zahlungsart löschen">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2;">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                `;

                // Lösch-Event-Listener
                item.querySelector('.btn-delete').addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    deletePaymentMethod(id);
                });

                container.appendChild(item);
            });
        })
        .catch(err => console.error("Fehler beim Laden der Zahlungsarten:", err));
}

// Zahlungsart löschen (AJAX DELETE)
function deletePaymentMethod(id) {
    if (!confirm("Möchten Sie diese Zahlungsart wirklich löschen?")) return;

    fetch('../backend/api/payment_methods.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: parseInt(id) })
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            alert("Fehler: " + result.error);
        } else {
            loadPaymentMethods();
        }
    })
    .catch(err => console.error("Fehler beim Löschen der Zahlungsart:", err));
}

// Neue Zahlungsart speichern (AJAX POST) — wird von setupPaymentFormToggle() (utils.js) aufgerufen
function saveNewPaymentMethod() {
    const provider = document.getElementById('new-provider').value;
    const details  = document.getElementById('new-details').value.trim();

    if (!details) {
        alert("Bitte füllen Sie die Details zur Zahlungsart aus.");
        return;
    }

    fetch('../backend/api/payment_methods.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, details })
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            alert("Fehler: " + result.error);
        } else {
            document.getElementById('new-details').value = '';
            document.getElementById('new-payment-form').style.display = 'none';
            document.getElementById('btn-toggle-new-pay').textContent = '+ Neue Zahlungsart hinzufügen';
            loadPaymentMethods();
        }
    })
    .catch(err => console.error("Fehler beim Hinzufügen der Zahlungsart:", err));
}

// --- Order history helpers ----------------------------------------------------
// formatPrice() und formatOrderDate() werden von utils.js bereitgestellt.

/**
 * Builds the HTML for a single order item row.
 * @param {{ name: string, quantity: number, line_total: number }} item
 * @returns {string}
 */
function buildOrderItemRow(item) {
    const { name, quantity, line_total } = item;
    return `
        <div class="order-item-row">
            <span style="color: var(--text-primary); font-weight: 500;">${name} (x${quantity})</span>
            <span style="font-weight: 600;">${formatPrice(line_total)}</span>
        </div>
    `;
}

// Bestellhistorie laden und rendern (EPIC 8)
function loadOrderHistory() {
    const container = document.getElementById('orders-list-container');
    if (!container) return;

    fetch('../backend/api/orders.php')
        .then(res => res.json())
        .then(orders => {
            if (orders.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted);">Sie haben bisher noch keine Bestellungen getätigt.</p>`;
                return;
            }

            container.innerHTML = '';
            orders.forEach(order => {
                const { id, order_date, total_price, discount, payment, voucher_code, items } = order;

                const orderCard = document.createElement('article');
                orderCard.className = 'order-card';

                // Formatiertes Datum und Beträge
                const date = new Date(order_date).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                const total             = formatPrice(total_price);
                const discountFormatted = formatPrice(discount);

                // Zahlungs-Icon und Tags
                const payIcon = getPaymentIcon(payment.provider);
                let tags = `<div class="info-tag">${payIcon} ${payment.provider} (${payment.details})</div>`;
                if (voucher_code) {
                    tags += `<div class="info-tag voucher">🏷️ Gutschein: ${voucher_code} (-${discountFormatted})</div>`;
                }

                // Produkte auflisten
                const itemsHtml = items.map(buildOrderItemRow).join('');

                orderCard.innerHTML = `
                    <div class="order-header">
                        <div class="order-meta">
                            <span style="font-weight: 700; color: var(--text-primary);">Bestellung #${id}</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${date}</span>
                        </div>
                        <div class="order-total-block">
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block; text-transform: uppercase;">Gesamtsumme</span>
                            <span class="order-total-val" style="font-size: 1.25rem; font-weight: 700;">${total}</span>
                        </div>
                    </div>

                    <div class="order-payment-voucher-info">
                        ${tags}
                    </div>

                    <div class="order-items-grid">
                        ${itemsHtml}
                    </div>

                    <div style="display: flex; justify-content: flex-end; margin-top: 15px;">
                        <a href="invoice.html?order_id=${id}" target="_blank" class="btn" style="padding: 8px 16px; font-size: 0.85rem; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: var(--text-primary);">
                            📄 Rechnung anzeigen / drucken
                        </a>
                    </div>
                `;

                container.appendChild(orderCard);
            });
        })
        .catch(err => console.error("Fehler beim Laden der Bestellhistorie:", err));
}

// Formular-Zusammensetzung (Profil abspeichern und Passwortabfrage Modal)
function setupForms() {
    const profileForm        = document.getElementById('profileForm');
    const passwordModal      = document.getElementById('password-modal');
    const modalCancel        = document.getElementById('modal-btn-cancel');
    const modalConfirm       = document.getElementById('modal-btn-confirm');
    const modalPasswordInput = document.getElementById('modal-password-input');

    let profilePendingData = null;

    if (profileForm && passwordModal) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Formulardaten sammeln
            profilePendingData = {
                salutation: document.getElementById('profile-salutation').value,
                firstname:  document.getElementById('profile-firstname').value.trim(),
                lastname:   document.getElementById('profile-lastname').value.trim(),
                address:    document.getElementById('profile-address').value.trim(),
                zip:        document.getElementById('profile-zip').value.trim(),
                city:       document.getElementById('profile-city').value.trim(),
                email:      document.getElementById('profile-email').value.trim(),
                username:   document.getElementById('profile-username').value.trim()
            };

            // Modal zur Sicherheitsüberprüfung einblenden (EPIC 8)
            modalPasswordInput.value = '';
            passwordModal.style.display = 'flex';
        });

        // Abbrechen im Modal
        modalCancel.addEventListener('click', () => {
            passwordModal.style.display = 'none';
            profilePendingData = null;
        });

        // Bestätigen im Modal (Profil updaten)
        modalConfirm.addEventListener('click', () => {
            const current_password = modalPasswordInput.value;
            if (!current_password) {
                alert("Bitte geben Sie Ihr Passwort ein.");
                return;
            }

            const payload = { ...profilePendingData, current_password };

            fetch('../backend/api/user.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.error); });
                }
                return res.json();
            })
            .then(result => {
                passwordModal.style.display = 'none';

                const status = document.getElementById('profile-status');
                status.textContent = result.message;
                status.style.color = 'var(--success-color)';

                // Header-Greeting über Session-Status aktualisieren
                if (typeof window.refreshCartBadge === 'function') {
                    window.location.reload(); // Einfacher Reload aktualisiert den Navbar-Status
                }
            })
            .catch(err => {
                const status = document.getElementById('profile-status');
                status.textContent = "Fehler: " + err.message;
                status.style.color = 'var(--danger-color)';
                passwordModal.style.display = 'none';
            });
        });
    }

    // Passwort ändern Formular
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const current_password = document.getElementById('password-current').value;
            const new_password     = document.getElementById('password-new').value;
            const confirm          = document.getElementById('password-confirm').value;

            if (new_password !== confirm) {
                alert("Die neuen Passwörter stimmen nicht überein.");
                return;
            }

            fetch('../backend/api/change_password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_password, new_password })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(err => { throw new Error(err.error); });
                }
                return res.json();
            })
            .then(result => {
                const status = document.getElementById('password-status');
                status.textContent = result.message;
                status.style.color = 'var(--success-color)';

                // Inputs leeren
                document.getElementById('password-current').value = '';
                document.getElementById('password-new').value     = '';
                document.getElementById('password-confirm').value = '';
            })
            .catch(err => {
                const status = document.getElementById('password-status');
                status.textContent = "Fehler: " + err.message;
                status.style.color = 'var(--danger-color)';
            });
        });
    }

    // Neue Zahlungsart: Toggle + Speichern (utils.js)
    setupPaymentFormToggle(saveNewPaymentMethod);
}
