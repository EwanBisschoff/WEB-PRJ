/**
 * @fileoverview Rechnungsseite Controller (EasyElectronics)
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Authentifizierungs-Check
    checkAuthentication();
});

// Authentifizierung prüfen und Bestell-ID extrahieren
function checkAuthentication() {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(({ loggedIn }) => {
            if (!loggedIn) {
                alert("Nicht autorisiert. Bitte melden Sie sich an.");
                window.location.href = 'login.html';
            } else {
                // Bestell-ID aus Query-Parameter lesen
                const params  = new URLSearchParams(window.location.search);
                const orderId = parseInt(params.get('order_id') || '0');

                if (orderId <= 0) {
                    showError("Ungültige Bestellnummer angegeben.");
                } else {
                    loadInvoiceData(orderId);
                }
            }
        })
        .catch(err => {
            console.error("Fehler bei Authentifizierungsprüfung:", err);
            window.location.href = 'login.html';
        });
}

// Rechnungsdaten vom Server abrufen
function loadInvoiceData(orderId) {
    fetch(`../backend/api/invoice.php?order_id=${orderId}`)
        .then(res => {
            if (!res.ok) {
                return res.json().then(err => { throw new Error(err.error); });
            }
            return res.json();
        })
        .then(invoice => {
            renderInvoice(invoice);
        })
        .catch(err => {
            showError("Fehler beim Laden der Rechnung: " + err.message);
        });
}

// Fehlermeldung anzeigen
function showError(message) {
    const container = document.getElementById('invoice-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f43f5e; font-weight: 500;">
                <p>⚠️ ${message}</p>
                <a href="account.html" class="btn btn-secondary no-print" style="margin-top: 20px; display: inline-block;">Zurück zu Mein Konto</a>
            </div>
        `;
    }
}

// Rechnung rendern
function renderInvoice(invoice) {
    const container = document.getElementById('invoice-container');
    if (!container) return;

    // Alle genutzten Felder destrukturieren — löst alle "Unresolved variable"-Warnungen
    const { date, items, voucher, company, invoice_number, order_id, customer, payment, subtotal, total_price } = invoice;
    const { discount, code: voucherCode } = voucher;
    const { name: companyName, address: companyAddress, city: companyCity, email: companyEmail, website, vat_id } = company;
    const { name: customerName, email: customerEmail } = customer;
    const { provider: paymentProvider, details: paymentDetails } = payment;

    // Formatiertes Datum
    const formattedDate = new Date(date).toLocaleDateString('de-DE', {
        day:   '2-digit',
        month: '2-digit',
        year:  'numeric'
    });

    // Artikellisten-Zeilen aufbauen
    let itemsRowsHtml = '';
    items.forEach(item => {
        itemsRowsHtml += `
            <tr>
                <td>
                    <strong>${item.name}</strong><br>
                    <span style="font-size: 0.8rem; color: var(--muted-color);">${item.category}</span>
                </td>
                <td class="num">${parseFloat(item.price).toFixed(2).replace('.', ',')} €</td>
                <td class="num">${item.quantity}</td>
                <td class="num" style="font-weight: 600;">${parseFloat(item.line_total).toFixed(2).replace('.', ',')} €</td>
            </tr>
        `;
    });

    // Rabatt-Zeile (nur anzeigen falls vorhanden)
    let discountRowHtml = '';
    if (parseFloat(discount) > 0) {
        discountRowHtml = `
            <tr>
                <td style="color: #10b981;">Gutschein (${voucherCode}):</td>
                <td class="num" style="color: #10b981;">-${parseFloat(discount).toFixed(2).replace('.', ',')} €</td>
            </tr>
        `;
    }

    // Rechnungsinhalt einsetzen (EPIC 8)
    container.innerHTML = `
        <!-- Briefkopf (Sender und Rechnungs-Info) -->
        <header class="invoice-header">
            <div class="address-block">
                <div class="company-logo">EasyElectronics</div>
                <strong>${companyName}</strong><br>
                ${companyAddress}<br>
                ${companyCity}<br>
                E-Mail: ${companyEmail}<br>
                Web: ${website}
            </div>

            <div class="invoice-title-block">
                <h2 class="invoice-title">RECHNUNG</h2>
                <div class="invoice-details">
                    <strong>Rechnungs-Nr:</strong> ${invoice_number}<br>
                    <strong>Bestell-Nr:</strong> #${order_id}<br>
                    <strong>Datum:</strong> ${formattedDate}<br>
                    <strong>Umsatzsteuer-ID:</strong> ${vat_id}
                </div>
            </div>
        </header>

        <!-- Empfänger & Zahlungsart -->
        <section class="billing-block">
            <div class="billing-col">
                <h3>Rechnungsempfänger</h3>
                <strong style="color: var(--text-primary);">${customerName}</strong><br>
                E-Mail: ${customerEmail}
            </div>

            <div class="billing-col">
                <h3>Zahlungsart</h3>
                <strong>Anbieter:</strong> ${paymentProvider}<br>
                <strong>Konto/Details:</strong> ${paymentDetails}
            </div>
        </section>

        <!-- Artikelliste Tabelle -->
        <table aria-label="Rechnungspositionen">
            <thead>
                <tr class="table-header">
                    <th>Produkt</th>
                    <th class="num">Einzelpreis</th>
                    <th class="num">Menge</th>
                    <th class="num">Gesamt</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRowsHtml}
            </tbody>
        </table>

        <!-- Zusammenfassung / Berechnungen -->
        <div class="calculation-section">
            <table class="calculation-table" aria-label="Berechnung der Gesamtsumme">
                <tbody>
                    <tr>
                        <td>Zwischensumme (Brutto):</td>
                        <td class="num">${parseFloat(subtotal).toFixed(2).replace('.', ',')} €</td>
                    </tr>
                    ${discountRowHtml}
                    <tr>
                        <td>Versandkosten:</td>
                        <td class="num">0,00 €</td>
                    </tr>
                    <tr class="total-row">
                        <td>Gesamtsumme:</td>
                        <td class="num">${parseFloat(total_price).toFixed(2).replace('.', ',')} €</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Fußzeile -->
        <footer class="footer">
            <p>EasyElectronics GmbH • Sitz: Wien • Firmenbuchgericht: Handelsgericht Wien • FN 987654x</p>
            <p>Vielen Dank für Ihren Einkauf! Bei Fragen kontaktieren Sie uns unter ${companyEmail}.</p>
        </footer>
    `;
}
