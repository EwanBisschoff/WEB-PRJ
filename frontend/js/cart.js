/**
 * @fileoverview Warenkorb-Seite Controller (EasyElectronics)
 * formatPrice() wird von utils.js bereitgestellt.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Warenkorb-Inhalt laden
    window.loadCartItems();

    // Checkout Button Klick-Event (EPIC 7)
    const checkoutBtn = document.getElementById('checkout-button');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // Prüfen, ob der Benutzer angemeldet ist
            fetch('../backend/api/session.php')
                .then(res => res.json())
                .then(({ loggedIn }) => {
                    if (loggedIn) {
                        // Weiterleitung zur Kasse
                        window.location.href = 'checkout.html';
                    } else {
                        // Benutzer warnen und zur Anmeldung leiten
                        alert("Bitte melden Sie sich an, um eine Bestellung aufzugeben.");
                        window.location.href = 'login.html?redirect=checkout.html';
                    }
                })
                .catch(err => {
                    console.error("Fehler beim Prüfen der Sitzung:", err);
                    alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
                });
        });
    }
});

// Global verfügbare Funktion zum Laden und Rendern der Warenkorb-Artikel
window.loadCartItems = function() {
    const contentView    = document.getElementById('cart-content-view');
    const emptyView      = document.getElementById('empty-cart-view');
    const itemsContainer = document.getElementById('cart-items');

    fetch('../backend/api/cart.php')
        .then(res => {
            if (!res.ok) throw new Error("Fehler beim Laden des Warenkorbs");
            return res.json();
        })
        .then(cart => {
            const { total_items, items, subtotal, shipping, grand_total } = cart;

            // Live-Badge im Header synchronisieren
            if (typeof window.updateCartBadge === 'function') {
                window.updateCartBadge(total_items);
            }

            if (!items || items.length === 0) {
                // Leeren Zustand anzeigen
                contentView.style.display = 'none';
                emptyView.style.display   = 'block';
                return;
            }

            // Warenkorb-Inhalt anzeigen
            emptyView.style.display   = 'none';
            contentView.style.display = 'grid';

            // Artikel rendern
            itemsContainer.innerHTML = '';
            items.forEach((item, index) => {
                const itemRow = document.createElement('article');
                itemRow.className = 'cart-item';
                itemRow.id        = `cart-item-${item.id}`;
                itemRow.style.animation = `card-entrance 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`;

                // Bilder-Rendering mit Fallback-Logik (EPIC 9)
                // SVG fallbacks — ry="2" removed (obsolete in SVG2, rx alone handles corner radius)
                const svgAudio = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
                const svgScreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

                const isAudio = item.category.toLowerCase() === 'audio';
                let itemIcon;

                if (item.image) {
                    const imageSrc  = item.image.includes('/') ? item.image : 'images/' + item.image;
                    const fallbackSvg = isAudio
                        ? svgAudio.replace('stroke-width="1.5">', 'stroke-width="1.5" style="display: none;">')
                        : svgScreen.replace('stroke-width="1.5">', 'stroke-width="1.5" style="display: none;">');
                    itemIcon = `<img src="${imageSrc}" alt="${item.name}" data-has-fallback="true" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">${fallbackSvg}`;
                } else {
                    itemIcon = isAudio ? svgAudio : svgScreen;
                }

                itemRow.innerHTML = `
                    <div class="cart-item-image-placeholder">
                        ${itemIcon}
                    </div>
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p>Kategorie: ${item.category}</p>
                        <p style="margin-top: 4px; font-weight: 500;">${parseFloat(item.price).toFixed(2).replace('.', ',')} € / Stk.</p>
                    </div>

                    <!-- Mengenwähler -->
                    <div class="quantity-control">
                        <button class="qty-btn" onclick="changeQuantity(${item.id}, ${item.quantity - 1})" aria-label="Menge reduzieren">-</button>
                        <input type="number" class="qty-input" value="${item.quantity}" min="1" max="99" onchange="updateQuantityInput(this, ${item.id})" aria-label="Menge">
                        <button class="qty-btn" onclick="changeQuantity(${item.id}, ${item.quantity + 1})" aria-label="Menge erhöhen">+</button>
                    </div>

                    <!-- Preis & Löschen -->
                    <div class="cart-item-price-info">
                        <span class="line-total">${parseFloat(item.line_total).toFixed(2).replace('.', ',')} €</span>
                        <button class="btn-delete" onclick="removeItemWithAnimation(${item.id})" aria-label="Artikel aus dem Warenkorb löschen">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                `;
                itemsContainer.appendChild(itemRow);

                // Attach onerror programmatically to avoid obsolete inline-handler attribute
                const imgEl = itemRow.querySelector('img[data-has-fallback]');
                if (imgEl) {
                    imgEl.onerror = function() {
                        this.style.display = 'none';
                        const sibling = /** @type {HTMLElement|null} */ (this.nextElementSibling);
                        if (sibling) sibling.style.display = 'block';
                    };
                }
            });

            // Zusammenfassung aktualisieren
            document.getElementById('cart-subtotal').textContent = parseFloat(subtotal).toFixed(2).replace('.', ',') + ' €';
            document.getElementById('cart-shipping').textContent = parseFloat(shipping).toFixed(2).replace('.', ',') + ' €';
            document.getElementById('cart-total').textContent    = parseFloat(grand_total).toFixed(2).replace('.', ',') + ' €';
        })
        .catch(err => {
            console.error(err);
            itemsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                    <p>Fehler beim Laden Ihres Warenkorbs. Bitte laden Sie die Seite neu.</p>
                </div>
            `;
        });
};

// Hilfsfunktion: Ändert die Menge eines Produkts
window.changeQuantity = function(productId, newQty) {
    if (newQty <= 0) {
        window.removeItemWithAnimation(productId);
        return;
    }

    fetch('../backend/api/cart.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action:     'update',
            product_id: parseInt(productId),
            quantity:   parseInt(newQty)
        })
    })
    .then(res => res.json())
    .then(() => {
        // Neu laden zur Live-Aktualisierung
        window.loadCartItems();
    })
    .catch(err => console.error("Fehler beim Ändern der Menge:", err));
};

// Hilfsfunktion: Validiert die manuelle Eingabe im Mengenwähler
window.updateQuantityInput = function(inputElement, productId) {
    let value = parseInt(inputElement.value, 10) || 1;
    if (value <= 0) value = 1;
    if (value > 99) value = 99;
    // Assign back as string to avoid number|string type mismatch on .value
    inputElement.value = String(value);
    window.changeQuantity(productId, value);
};

// Hilfsfunktion: Löscht ein Produkt mit einer geschmeidigen CSS-Animation
window.removeItemWithAnimation = function(productId) {
    const itemRow = document.getElementById(`cart-item-${productId}`);
    if (itemRow) {
        // Animationstransitionen anwenden (Ausgleiten & Schrumpfen)
        itemRow.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
        itemRow.style.opacity    = '0';
        itemRow.style.transform  = 'translateX(-30px)';

        // Nach Ablauf der Animation den Server-Call abschicken und UI neu laden
        setTimeout(() => {
            fetch('../backend/api/cart.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action:     'remove',
                    product_id: parseInt(productId)
                })
            })
            .then(res => res.json())
            .then(() => {
                window.loadCartItems();
            })
            .catch(err => console.error("Fehler beim Löschen des Produkts:", err));
        }, 350);
    }
};
