/**
 * @fileoverview Bestellungs-Verwaltung (EasyElectronics)
 */

document.addEventListener("DOMContentLoaded", () => {
    // Authentifizierungsprüfung beim Laden der Seite
    checkAuthentication();
});

// Überprüfen, ob der Benutzer angemeldet ist
function checkAuthentication() {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(({ loggedIn }) => {
            if (!loggedIn) {
                // Wenn nicht angemeldet, zurück zum Login
                alert("Bitte melden Sie sich an, um Ihre Bestellungen zu sehen.");
                window.location.href = 'login.html';
            } else {
                // Wenn angemeldet, Bestellungen laden
                loadOrderHistory();
            }
        })
        .catch(err => {
            console.error("Authentifizierungsprüfung fehlgeschlagen:", err);
            window.location.href = 'login.html';
        });
}

// Bestellhistorie vom API laden
function loadOrderHistory() {
    const container = document.getElementById('orders-history-container');
    if (!container) return;

    fetch('../backend/api/orders.php')
        .then(res => {
            if (!res.ok) throw new Error("Fehler beim Laden der Bestellungen");
            return res.json();
        })
        .then(orders => {
            renderOrders(orders);
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <p>Fehler beim Laden Ihrer Bestellungen. Bitte laden Sie die Seite neu.</p>
                </div>
            `;
        });
}

// Bestellungen im UI rendern
function renderOrders(orders) {
    const container = document.getElementById('orders-history-container');
    if (!container) return;

    if (orders.length === 0) {
        // noinspection HtmlUnknownTarget
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 24px;">
                <svg style="width: 80px; height: 80px; color: var(--text-muted); opacity: 0.3; margin-bottom: 20px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h2>Sie haben noch keine Bestellungen getätigt.</h2>
                <p style="color: var(--text-muted); margin-bottom: 30px; margin-top: 10px;">Stöbern Sie in unserem Shop und geben Sie Ihre erste Bestellung auf!</p>
                <a href="index.html" class="btn btn-primary">Jetzt einkaufen</a>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    orders.forEach((order, index) => {
        const orderCard = document.createElement('article');
        orderCard.className = 'order-card';
        orderCard.style.animation = `card-entrance 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`;

        // Alle benötigten Felder destrukturieren
        const { id: orderId, order_date, total_price, discount, payment, voucher_code, items } = order;
        const { provider: payProvider, details: payDetails } = payment;

        // Formatierte Werte
        const formattedDate     = new Date(order_date).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        const formattedTotal    = parseFloat(total_price).toFixed(2).replace('.', ',') + ' €';
        const formattedDiscount = parseFloat(discount).toFixed(2).replace('.', ',') + ' €';

        // Zahlungs-Icon (redundanter Initializer vermieden → direktes const)
        const payIcon = payProvider === 'Visa' || payProvider === 'MasterCard'
            ? '💳'
            : payProvider === 'PayPal'
                ? '🅿️'
                : '💵';

        // Tags aufbauen (Zahlung und Gutschein)
        let tagsHtml = `
            <div class="info-tag" title="Verwendete Zahlungsart">
                ${payIcon} ${payProvider} (${payDetails})
            </div>
        `;

        if (voucher_code) {
            tagsHtml += `
                <div class="info-tag voucher" title="Eingelöster Gutschein">
                    🏷️ Gutschein: ${voucher_code} (-${formattedDiscount})
                </div>
            `;
        }

        // HTML für die einzelnen Artikel generieren
        // SVG: ry="2" entfernt (obsolet in SVG2, rx="2" allein genügt)
        let itemsHtml = '';
        items.forEach(item => {
            const isAudio = item.category.toLowerCase() === 'audio';
            const itemIconSvg = isAudio
                ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

            const itemLineTotal = parseFloat(item.line_total).toFixed(2).replace('.', ',') + ' €';
            const itemPrice     = parseFloat(item.price).toFixed(2).replace('.', ',') + ' €';

            itemsHtml += `
                <div class="order-item-row">
                    <div class="item-row-left">
                        <div class="item-icon-circle">
                            ${itemIconSvg}
                        </div>
                        <div class="item-details-meta">
                            <h4>${item.name}</h4>
                            <span>Kategorie: ${item.category} | ${itemPrice} pro Stück</span>
                        </div>
                    </div>
                    <div class="item-row-right">
                        <span class="item-qty-lbl">Menge: ${item.quantity}</span>
                        <span class="item-total-lbl">${itemLineTotal}</span>
                    </div>
                </div>
            `;
        });

        // Zusammenbauen
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-meta">
                    <span class="order-id">Bestell-ID: #${orderId}</span>
                    <span class="order-date">Bestellt am ${formattedDate}</span>
                </div>
                <div class="order-total-block">
                    <div class="order-total-label">Gesamtsumme</div>
                    <div class="order-total-val">${formattedTotal}</div>
                </div>
            </div>

            <div class="order-payment-voucher-info">
                ${tagsHtml}
            </div>

            <div class="order-items-grid">
                ${itemsHtml}
            </div>
        `;

        container.appendChild(orderCard);
    });
}
