// Rechnungsseite Controller (EasyElectronics)

document.addEventListener("DOMContentLoaded", () => {
    // 1. Authentifizierungs-Check
    checkAuthentication();
});

// Authentifizierung prüfen und Bestell-ID extrahieren
function checkAuthentication() {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(session => {
            if (!session.loggedIn) {
                alert("Nicht autorisiert. Bitte melden Sie sich an.");
                window.location.href = 'login.html';
            } else {
                // Bestell-ID aus Query-Parameter lesen
                const params = new URLSearchParams(window.location.search);
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

    // Formatiertes Datum
    const formattedDate = new Date(invoice.date).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Artikellisten-Zeilen aufbauen
    let itemsRowsHtml = '';
    invoice.items.forEach(item => {
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
    if (parseFloat(invoice.voucher.discount) > 0) {
        discountRowHtml = `
            <tr>
                <td style="color: #10b981;">Gutschein (${invoice.voucher.code}):</td>
                <td class="num" style="color: #10b981;">-${parseFloat(invoice.voucher.discount).toFixed(2).replace('.', ',')} €</td>
            </tr>
        `;
    }

    // Rechnungsinhalt einsetzen (EPIC 8)
    container.innerHTML = `
        <!-- Briefkopf (Sender und Rechnungs-Info) -->
        <header class="invoice-header">
            <div class="address-block">
                <div class="company-logo">EasyElectronics</div>
                <strong>${invoice.company.name}</strong><br>
                ${invoice.company.address}<br>
                ${invoice.company.city}<br>
                E-Mail: ${invoice.company.email}<br>
                Web: ${invoice.company.website}
            </div>
            
            <div class="invoice-title-block">
                <h2 class="invoice-title">RECHNUNG</h2>
                <div class="invoice-details">
                    <strong>Rechnungs-Nr:</strong> ${invoice.invoice_number}<br>
                    <strong>Bestell-Nr:</strong> #${invoice.order_id}<br>
                    <strong>Datum:</strong> ${formattedDate}<br>
                    <strong>Umsatzsteuer-ID:</strong> ${invoice.company.vat_id}
                </div>
            </div>
        </header>

        <!-- Empfänger & Zahlungsart -->
        <section class="billing-block">
            <div class="billing-col">
                <h3>Rechnungsempfänger</h3>
                <strong style="color: var(--text-primary);">${invoice.customer.name}</strong><br>
                E-Mail: ${invoice.customer.email}
            </div>
            
            <div class="billing-col">
                <h3>Zahlungsart</h3>
                <strong>Anbieter:</strong> ${invoice.payment.provider}<br>
                <strong>Konto/Details:</strong> ${invoice.payment.details}
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
                        <td class="num">${parseFloat(invoice.subtotal).toFixed(2).replace('.', ',')} €</td>
                    </tr>
                    ${discountRowHtml}
                    <tr>
                        <td>Versandkosten:</td>
                        <td class="num">0,00 €</td>
                    </tr>
                    <tr class="total-row">
                        <td>Gesamtsumme:</td>
                        <td class="num">${parseFloat(invoice.total_price).toFixed(2).replace('.', ',')} €</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Fußzeile -->
        <footer class="footer">
            <p>EasyElectronics GmbH • Sitz: Wien • Firmenbuchgericht: Handelsgericht Wien • FN 987654x</p>
            <p>Vielen Dank für Ihren Einkauf! Bei Fragen kontaktieren Sie uns unter ${invoice.company.email}.</p>
        </footer>
    `;
}
