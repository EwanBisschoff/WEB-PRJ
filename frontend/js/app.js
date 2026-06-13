// Startseiten Produkt-Katalog Controller (EasyElectronics)

// Variable für das Such-Debounce (verhindert Spam)
let searchTimeout = null;

// Erweitert um den Suchparameter (Standardwert ist leer)
function loadProducts(category = 'Elektronik', search = '') {
    const productsContainer = document.getElementById('products');

    // Skeleton Loader / Lade-Animation für Premium-Feel
    productsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
            <svg class="pop-animation" style="width: 40px; height: 40px; animation: pulse-glow 1.5s infinite;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
            </svg>
            <p style="margin-top: 15px;">Produkte werden geladen...</p>
        </div>
    `;

    // API-Query erweitern: Kategorie UND Suchbegriff mit AJAX
    const encodedCategory = encodeURIComponent(category);
    const encodedSearch = encodeURIComponent(search);

    fetch(`../backend/api/products.php?category=${encodedCategory}&search=${encodedSearch}`)
        .then(response => {
            if (!response.ok) throw new Error("Fehler beim Laden der Produkte");
            return response.json();
        })
        .then(data => {
            // Wenn die Filterung keine Treffer erzielt
            if (data.length === 0) {
                productsContainer.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
                        <p>Keine Produkte für Ihre Suche oder Filterung gefunden.</p>
                    </div>
                `;
                return;
            }

            productsContainer.innerHTML = '';

            data.forEach((product, index) => {
                const card = document.createElement('div');
                card.className = 'product';
                card.setAttribute('draggable', 'true');
                card.style.animation = `card-entrance 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`;

                // Bilder-Rendering mit Fallback-Logik (EPIC 9)
                // SVG fallbacks — ry="2" entfernt (obsolet in SVG2, rx allein genügt)
                const svgAudio  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
                const svgScreen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`;

                const isAudio = product.category.toLowerCase() === 'audio';
                let productIcon;

                if (product.image) {
                    const imageSrc    = product.image.includes('/') ? product.image : 'images/' + product.image;
                    const fallbackSvg = (isAudio ? svgAudio : svgScreen)
                        .replace('stroke-width="1.5">', 'stroke-width="1.5" style="display: none;">');
                    productIcon = `<img src="${imageSrc}" alt="${product.name}" data-has-fallback="true" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">${fallbackSvg}`;
                } else {
                    productIcon = isAudio ? svgAudio : svgScreen;
                }

                card.innerHTML = `
                    <div class="product-image-container">
                        <span class="drag-handle-hint">Zieh mich! 👆</span>
                        ${productIcon}
                    </div>
                    <div class="product-details">
                        <h2>${product.name}</h2>
                        <p title="${product.description || ''}">${product.description || 'Keine Beschreibung verfügbar.'}</p>
                    </div>
                    <div class="product-price-row">
                        <span class="price">${parseFloat(product.price).toFixed(2).replace('.', ',')} €</span>
                        <button class="btn btn-primary btn-add-cart" data-id="${product.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            In den Warenkorb
                        </button>
                    </div>
                `;

                // 3D-Leuchteffekt bei Mausbewegung
                card.addEventListener('mousemove', (e) => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty('--x', `${x}px`);
                    card.style.setProperty('--y', `${y}px`);
                });

                // HTML5 Drag & Drop: Drag Start
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', product.id);
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'copy';
                });

                // Drag End
                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                });

                // Klick auf "In den Warenkorb"
                card.querySelector('.btn-add-cart').addEventListener('click', function() {
                    const productId = this.getAttribute('data-id');
                    addProductToCart(productId);
                });

                productsContainer.appendChild(card);

                // Attach onerror programmatically to avoid obsolete inline-handler attribute
                const imgEl = card.querySelector('img[data-has-fallback]');
                if (imgEl) {
                    imgEl.onerror = function() {
                        this.style.display = 'none';
                        const sibling = /** @type {HTMLElement|null} */ (this.nextElementSibling);
                        if (sibling) sibling.style.display = 'block';
                    };
                }
            });
        })
        .catch(err => {
            console.error(err);
            productsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger-color);">
                    <p>Fehler beim Laden der Produkte. Bitte prüfen Sie Ihre Verbindung oder Datenbank.</p>
                </div>
            `;
        });
}

// AJAX POST zum Hinzufügen eines Produkts
function addProductToCart(productId) {
    fetch('../backend/api/cart.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'add',
            product_id: parseInt(productId)
        })
    })
        .then(res => res.json())
        .then(cart => {
            if (cart.error) {
                alert("Fehler: " + cart.error);
            } else {
                const { total_items } = cart;
                if (typeof window.updateCartBadge === 'function') {
                    window.updateCartBadge(total_items);
                }
            }
        })
        .catch(err => console.error("AJAX-Fehler beim Hinzufügen zum Warenkorb:", err));
}

// Hilfsfunktion: Fragt die aktuellen UI-Filter-Werte ab und startet das Laden
function triggerFilteredLoad() {
    const currentCategory = document.getElementById('categorySelect').value;
    const currentSearch = document.getElementById('searchInput').value;
    loadProducts(currentCategory, currentSearch);
}

// --- EVENT LISTENERS ---

// Initialisierung bei Seitenstart
loadProducts();

// Kategorie-Filter Event Listener
document.getElementById('categorySelect').addEventListener('change', triggerFilteredLoad);

// Continuous Search Event Listener mit Debounce (500ms)
document.getElementById('searchInput').addEventListener('input', function() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        triggerFilteredLoad();
    }, 500); // Wartet 500ms nach dem letzten Tastendruck, danach suche
});