// Admin-Bereich Controller (EasyElectronics)

document.addEventListener("DOMContentLoaded", () => {
    // Tab-Wechsel einrichten
    setupTabs();

    // Initiale Daten laden
    loadProducts();
    loadVouchers();
    loadCustomers();
    loadProductsDropdown(); // Für Bestellungsbearbeitungs-Selektor

    // Event-Listener für Produkte
    const btnAddProduct = document.getElementById('btn-add-product');
    if (btnAddProduct) btnAddProduct.addEventListener('click', openAddProductModal);

    const btnCloseProductModal = document.getElementById('btn-close-product-modal');
    if (btnCloseProductModal) btnCloseProductModal.addEventListener('click', () => {
        document.getElementById('modal-product').style.display = 'none';
    });

    const formProduct = document.getElementById('form-product');
    if (formProduct) formProduct.addEventListener('submit', saveProduct);

    // Bild-Upload-Events
    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const inputProductImageFile = document.getElementById('product-image-file');
    if (btnTriggerUpload && inputProductImageFile) {
        btnTriggerUpload.addEventListener('click', () => inputProductImageFile.click());
        inputProductImageFile.addEventListener('change', uploadProductImage);
    }

    // Event-Listener für Gutscheine
    const btnAddVoucher = document.getElementById('btn-add-voucher');
    if (btnAddVoucher) btnAddVoucher.addEventListener('click', () => {
        document.getElementById('form-voucher').reset();
        document.getElementById('modal-voucher').style.display = 'flex';
    });

    const btnCloseVoucherModal = document.getElementById('btn-close-voucher-modal');
    if (btnCloseVoucherModal) btnCloseVoucherModal.addEventListener('click', () => {
        document.getElementById('modal-voucher').style.display = 'none';
    });

    const formVoucher = document.getElementById('form-voucher');
    if (formVoucher) formVoucher.addEventListener('submit', saveVoucher);

    // Event-Listener für Bestellungsmodals schließen
    const btnCloseOrdersModal = document.getElementById('btn-close-orders-modal');
    if (btnCloseOrdersModal) btnCloseOrdersModal.addEventListener('click', () => {
        document.getElementById('modal-customer-orders').style.display = 'none';
    });

    const btnCloseEditOrderModal = document.getElementById('btn-close-edit-order-modal');
    const modalEditOrder = document.getElementById('modal-edit-order');
    if (btnCloseEditOrderModal && modalEditOrder) {
        btnCloseEditOrderModal.addEventListener('click', () => {
            modalEditOrder.style.display = 'none';
            // Nach dem Editieren einer Bestellung die Kundenbestellungen neu laden
            if (activeOrderEditCustomerId > 0) {
                viewCustomerOrders(activeOrderEditCustomerId, activeOrderEditCustomerName);
            }
        });
    }
});

// Globale Variablen für Bestellbearbeitungskontext
let allProductsList = []; // Cache aller Produkte für Bestellbearbeitungs-Dropdown
let activeOrderEditCustomerId = 0;
let activeOrderEditCustomerName = '';

// Tab-Switching Funktionalität
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-target');

            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabPanels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(target);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });
}

// ----------------------------------------------------
// 1. PRODUKT VERWALTUNG
// ----------------------------------------------------

// Produkte aus API laden
function loadProducts() {
    fetch('../backend/api/admin_products.php')
        .then(res => res.json())
        .then(products => {
            const tbody = document.getElementById('tbl-products-body');
            if (!tbody) return;

            tbody.innerHTML = '';
            products.forEach(product => {
                const tr = document.createElement('tr');
                
                // Bild Vorschau
                const imageSrc = product.image ? (product.image.includes('/') ? product.image : 'images/' + product.image) : '';
                const imgHtml = imageSrc 
                    ? `<img src="${imageSrc}" alt="${product.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px;">`
                    : `<div style="width: 40px; height: 40px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: var(--text-muted);">Kein Bild</div>`;

                const price = parseFloat(product.price).toFixed(2).replace('.', ',') + ' €';
                const rating = product.rating ? parseFloat(product.rating).toFixed(1) + ' / 5.0' : '-';

                tr.innerHTML = `
                    <td>${imgHtml}</td>
                    <td><strong>${product.name}</strong></td>
                    <td>${product.category}</td>
                    <td>${price}</td>
                    <td>⭐ ${rating}</td>
                    <td style="text-align: right;">
                        <button class="btn" onclick="openEditProductModal(${JSON.stringify(product).replace(/"/g, '&quot;')})" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(99,102,241,0.1); color: var(--primary-color);">
                            Bearbeiten
                        </button>
                        <button class="btn" onclick="deleteProduct(${product.id})" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(244,63,94,0.1); color: var(--danger-color);">
                            Löschen
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error("Fehler beim Laden der Produkte:", err));
}

// Modal zum Hinzufügen öffnen
function openAddProductModal() {
    document.getElementById('modal-product-title').textContent = "Neues Produkt erstellen";
    document.getElementById('form-product').reset();
    document.getElementById('product-id').value = '';
    document.getElementById('product-image-path').value = '';
    document.getElementById('image-preview').innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Kein Bild</span>`;
    document.getElementById('modal-product').style.display = 'flex';
}

// Modal zum Bearbeiten öffnen
function openEditProductModal(product) {
    document.getElementById('modal-product-title').textContent = "Produkt bearbeiten";
    document.getElementById('product-id').value = product.id;
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-description').value = product.description || '';
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-rating').value = product.rating || '';
    document.getElementById('product-category').value = product.category;
    document.getElementById('product-image-path').value = product.image || '';

    const preview = document.getElementById('image-preview');
    if (product.image) {
        const imageSrc = product.image.includes('/') ? product.image : 'images/' + product.image;
        preview.innerHTML = `<img src="${imageSrc}" alt="Vorschau">`;
    } else {
        preview.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Kein Bild</span>`;
    }

    document.getElementById('modal-product').style.display = 'flex';
}

// Produktbild hochladen (AJAX)
function uploadProductImage() {
    const fileInput = document.getElementById('product-image-file');
    const preview = document.getElementById('image-preview');
    const pathInput = document.getElementById('product-image-path');

    if (!fileInput.files || fileInput.files.length === 0) return;

    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    preview.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">Hochladen...</span>`;

    fetch('../backend/api/upload_image.php', {
        method: 'POST',
        body: formData
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error); });
        }
        return res.json();
    })
    .then(result => {
        pathInput.value = result.image_path;
        preview.innerHTML = `<img src="${result.image_path}" alt="Vorschau">`;
    })
    .catch(err => {
        alert("Upload-Fehler: " + err.message);
        preview.innerHTML = `<span style="font-size: 0.8rem; color: var(--danger-color);">Fehler</span>`;
        pathInput.value = '';
    });
}

// Produkt speichern (Erstellen / Aktualisieren)
function saveProduct(e) {
    e.preventDefault();

    const productId = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const description = document.getElementById('product-description').value;
    const price = document.getElementById('product-price').value;
    const rating = document.getElementById('product-rating').value;
    const category = document.getElementById('product-category').value;
    const image = document.getElementById('product-image-path').value;

    const payload = {
        name, description, price, category, image,
        rating: rating !== '' ? parseFloat(rating) : null
    };

    let url = '../backend/api/admin_products.php';
    let method = 'POST'; // Erstellen

    if (productId !== '') {
        payload.id = parseInt(productId);
        method = 'PUT'; // Bearbeiten
    }

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            alert("Fehler beim Speichern: " + result.error);
        } else {
            alert(result.message);
            document.getElementById('modal-product').style.display = 'none';
            loadProducts();
            loadProductsDropdown(); // Dropdown aktualisieren
        }
    })
    .catch(err => console.error("Fehler beim Speichern des Produkts:", err));
}

// Produkt löschen
window.deleteProduct = function(id) {
    if (!confirm("Möchten Sie dieses Produkt wirklich löschen? Dies kann nicht rückgängig gemacht werden.")) return;

    fetch('../backend/api/admin_products.php', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: parseInt(id) })
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            alert("Fehler beim Löschen: " + result.error);
        } else {
            alert(result.message);
            loadProducts();
            loadProductsDropdown();
        }
    })
    .catch(err => console.error("Fehler beim Löschen des Produkts:", err));
};

// ----------------------------------------------------
// 2. GUTSCHEIN VERWALTUNG
// ----------------------------------------------------

// Gutscheine laden
function loadVouchers() {
    fetch('../backend/api/admin_vouchers.php')
        .then(res => res.json())
        .then(vouchers => {
            const tbody = document.getElementById('tbl-vouchers-body');
            if (!tbody) return;

            tbody.innerHTML = '';
            vouchers.forEach(voucher => {
                const tr = document.createElement('tr');
                
                const val = parseFloat(voucher.value).toFixed(2).replace('.', ',') + ' €';
                const origVal = parseFloat(voucher.original_value).toFixed(2).replace('.', ',') + ' €';
                
                const expiry = voucher.expiry_date ? new Date(voucher.expiry_date).toLocaleDateString('de-DE') : '-';
                
                // Status-Badge stylen
                let badgeClass = 'status-active';
                if (voucher.status === 'abgelaufen') badgeClass = 'status-expired';
                if (voucher.status === 'eingelöst') badgeClass = 'status-redeemed';

                tr.innerHTML = `
                    <td><code>${voucher.code}</code></td>
                    <td><strong>${val}</strong></td>
                    <td>${origVal}</td>
                    <td>${expiry}</td>
                    <td><span class="status-badge ${badgeClass}">${voucher.status}</span></td>
                    <td style="text-align: right;">
                        <button class="btn" onclick="deleteVoucher(${voucher.id})" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(244,63,94,0.1); color: var(--danger-color);">
                            Löschen
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error("Fehler beim Laden der Gutscheine:", err));
}

// Gutschein speichern
function saveVoucher(e) {
    e.preventDefault();

    const code = document.getElementById('voucher-code-input').value.trim();
    const value = document.getElementById('voucher-value').value;
    const expiryDate = document.getElementById('voucher-expiry').value;

    const payload = {
        code, value,
        expiry_date: expiryDate !== '' ? expiryDate : null
    };

    fetch('../backend/api/admin_vouchers.php', {
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
        alert(result.message);
        document.getElementById('modal-voucher').style.display = 'none';
        loadVouchers();
    })
    .catch(err => alert("Fehler beim Erstellen des Gutscheins: " + err.message));
}

// Gutschein löschen
window.deleteVoucher = function(id) {
    if (!confirm("Möchten Sie diesen Gutschein wirklich löschen?")) return;

    fetch('../backend/api/admin_vouchers.php', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: parseInt(id) })
    })
    .then(res => res.json())
    .then(result => {
        if (result.error) {
            alert("Fehler beim Löschen: " + result.error);
        } else {
            alert(result.message);
            loadVouchers();
        }
    })
    .catch(err => console.error("Fehler beim Löschen des Gutscheins:", err));
};

// ----------------------------------------------------
// 3. KUNDEN & BESTELLUNGEN VERWALTUNG
// ----------------------------------------------------

// Kunden laden
function loadCustomers() {
    fetch('../backend/api/admin_users.php')
        .then(res => res.json())
        .then(users => {
            const tbody = document.getElementById('tbl-users-body');
            if (!tbody) return;

            tbody.innerHTML = '';
            users.forEach(user => {
                const tr = document.createElement('tr');
                
                const fullName = user.firstname + ' ' + user.lastname;
                
                // Status-Badge stylen
                let statusBadge = '';
                if (intval(user.is_blocked) === 1) {
                    statusBadge = `<span class="status-badge status-blocked">Gesperrt</span>`;
                } else {
                    statusBadge = `<span class="status-badge status-active">Aktiv</span>`;
                }

                // Block-Button Text anpassen
                const isBlocked = intval(user.is_blocked) === 1;
                const blockAction = isBlocked ? 'unblock' : 'block';
                const blockBtnText = isBlocked ? 'Entsperren' : 'Sperren';
                const blockBtnColor = isBlocked ? 'var(--success-color)' : 'var(--danger-color)';
                const blockBtnBg = isBlocked ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)';

                // Nur Nicht-Admin Kunden bearbeitbar machen (Verhinderung von Selbstsperre)
                const isAdmin = user.role === 'admin';
                const disabledAttr = isAdmin ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : '';

                tr.innerHTML = `
                    <td>#${user.id}</td>
                    <td><strong>${fullName}</strong> ${isAdmin ? '<span style="font-size:0.75rem; color:var(--primary-color);">[Admin]</span>' : ''}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${statusBadge}</td>
                    <td style="text-align: right;">
                        <button class="btn" onclick="viewCustomerOrders(${user.id}, '${fullName}')" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(255,255,255,0.05); color: var(--text-primary);">
                            Bestellungen
                        </button>
                        <button class="btn" onclick="toggleBlockUser(${user.id}, '${blockAction}')" ${disabledAttr} style="padding: 6px 12px; font-size: 0.8rem; background: ${blockBtnBg}; color: ${blockBtnColor};">
                            ${blockBtnText}
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => console.error("Fehler beim Laden der Kunden:", err));
}

// Hilfsfunktion: intval Emulation
function intval(val) {
    return parseInt(val) || 0;
}

// Benutzer sperren / entsperren
window.toggleBlockUser = function(userId, action) {
    const confirmMsg = action === 'block' 
        ? "Möchten Sie diesen Kunden wirklich sperren? Der Login wird damit sofort blockiert."
        : "Möchten Sie diesen Kunden wieder entsperren?";
        
    if (!confirm(confirmMsg)) return;

    fetch('../backend/api/admin_users.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: parseInt(userId), action: action })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error); });
        }
        return res.json();
    })
    .then(result => {
        alert(result.message);
        loadCustomers();
    })
    .catch(err => alert("Fehler beim Sperren/Entsperren: " + err.message));
};

// Bestellungen eines Kunden anzeigen
window.viewCustomerOrders = function(userId, fullName) {
    activeOrderEditCustomerId = userId;
    activeOrderEditCustomerName = fullName;

    const modal = document.getElementById('modal-customer-orders');
    const container = document.getElementById('customer-orders-container');
    const title = document.getElementById('orders-modal-title');

    if (!modal || !container || !title) return;

    title.textContent = `Bestellungen von ${fullName}`;
    container.innerHTML = `<p style="color: var(--text-muted);">Bestellungen werden geladen...</p>`;
    modal.style.display = 'flex';

    fetch(`../backend/api/admin_orders.php?user_id=${userId}`)
        .then(res => res.json())
        .then(orders => {
            if (orders.length === 0) {
                container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 20px;">Dieser Kunde hat bisher noch keine Bestellungen getätigt.</p>`;
                return;
            }

            container.innerHTML = '';
            orders.forEach(order => {
                const orderCard = document.createElement('div');
                orderCard.className = 'order-card';
                orderCard.style.background = 'rgba(0,0,0,0.15)';
                
                const date = new Date(order.order_date).toLocaleDateString('de-DE', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                const total = parseFloat(order.total_price).toFixed(2).replace('.', ',') + ' €';
                const discount = parseFloat(order.discount).toFixed(2).replace('.', ',') + ' €';

                let tags = `<div class="info-tag">${order.payment.provider} (${order.payment.details})</div>`;
                if (order.voucher_code) {
                    tags += `<div class="info-tag voucher">🏷️ Gutschein: ${order.voucher_code} (-${discount})</div>`;
                }

                // Artikelliste aufbauen
                let itemsHtml = '';
                order.items.forEach(item => {
                    const lineTotal = parseFloat(item.line_total).toFixed(2).replace('.', ',') + ' €';
                    itemsHtml += `
                        <div class="order-item-row" style="background: rgba(0,0,0,0.1);">
                            <span>${item.name} (x${item.quantity})</span>
                            <span style="font-weight: 600;">${lineTotal}</span>
                        </div>
                    `;
                });

                orderCard.innerHTML = `
                    <div class="order-header">
                        <div class="order-meta">
                            <span style="font-weight: 700; color: var(--text-primary);">Bestellung #${order.id}</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">${date}</span>
                        </div>
                        <div class="order-total-block">
                            <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">Gesamtsumme</span>
                            <span class="order-total-val" style="font-size: 1.25rem; font-weight: 700;">${total}</span>
                        </div>
                    </div>
                    
                    <div class="order-payment-voucher-info" style="margin-bottom: 12px;">
                        ${tags}
                    </div>
                    
                    <div class="order-items-grid" style="margin-bottom: 15px;">
                        ${itemsHtml}
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn" onclick="openEditOrderModal(${JSON.stringify(order).replace(/"/g, '&quot;')})" style="padding: 6px 12px; font-size: 0.8rem; background: rgba(99,102,241,0.1); color: var(--primary-color);">
                            ✏️ Bestellung bearbeiten
                        </button>
                    </div>
                `;

                container.appendChild(orderCard);
            });
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = `<p style="color: var(--danger-color);">Fehler beim Laden der Bestellungen.</p>`;
        });
};

// ----------------------------------------------------
// 4. BESTELLUNG BEARBEITEN (ARTIKEL ADD/REMOVE)
// ----------------------------------------------------

// Bestellbearbeitungs-Modal öffnen
let activeEditOrder = null;
window.openEditOrderModal = function(order) {
    activeEditOrder = order;

    document.getElementById('edit-order-id-label').textContent = order.id;
    renderOrderItemsEditor();
    
    // Bestellbearbeitungsmodal anzeigen
    document.getElementById('modal-edit-order').style.display = 'flex';
};

// Artikel in der Bestellung auflisten (mit Lösch-Option)
function renderOrderItemsEditor() {
    const container = document.getElementById('order-items-editor-container');
    if (!container || !activeEditOrder) return;

    container.innerHTML = '';
    
    if (activeEditOrder.items.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); italic">Keine Produkte in dieser Bestellung.</p>`;
        return;
    }

    activeEditOrder.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'order-item-row';
        row.style.background = 'rgba(0, 0, 0, 0.15)';
        row.style.padding = '10px 15px';
        
        const price = parseFloat(item.price).toFixed(2).replace('.', ',') + ' €';
        const total = parseFloat(item.line_total).toFixed(2).replace('.', ',') + ' €';

        row.innerHTML = `
            <div>
                <span style="font-weight: 600; color: var(--text-primary);">${item.name}</span><br>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Menge: ${item.quantity} x ${price}</span>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <span style="font-weight: 700;">${total}</span>
                <button class="btn btn-delete" onclick="removeItemFromOrder(${activeEditOrder.id}, ${item.product_id})" aria-label="Artikel entfernen" style="padding: 6px; width: 30px; height: 30px;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `;
        container.appendChild(row);
    });

    // Event-Listener für das Hinzufügen binden
    const btnAddItem = document.getElementById('btn-add-item-to-order');
    if (btnAddItem) {
        // Event-Listener ersetzen durch Klonen, um mehrfache Bindungen zu vermeiden
        const newBtn = btnAddItem.cloneNode(true);
        btnAddItem.parentNode.replaceChild(newBtn, btnAddItem);
        
        newBtn.addEventListener('click', () => {
            addItemToOrder();
        });
    }
}

// Artikel aus einer Bestellung entfernen (AJAX DELETE)
window.removeItemFromOrder = function(orderId, productId) {
    if (!confirm("Möchten Sie dieses Produkt wirklich aus der Bestellung entfernen?")) return;

    fetch(`../backend/api/admin_orders.php?order_id=${orderId}&product_id=${productId}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error); });
        }
        return res.json();
    })
    .then(result => {
        // Bestellung neu laden und Editor aktualisieren
        reloadActiveOrderAndEditor(orderId);
    })
    .catch(err => alert("Fehler beim Entfernen des Artikels: " + err.message));
};

// Artikel zu einer Bestellung hinzufügen (AJAX POST)
function addItemToOrder() {
    const productSelect = document.getElementById('add-item-select');
    const qtyInput = document.getElementById('add-item-qty');

    if (!productSelect || !qtyInput || !activeEditOrder) return;

    const productId = parseInt(productSelect.value);
    const quantity = parseInt(qtyInput.value);

    if (productId <= 0 || quantity <= 0) {
        alert("Bitte wählen Sie ein Produkt und eine gültige Menge aus.");
        return;
    }

    fetch('../backend/api/admin_orders.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            order_id: activeEditOrder.id,
            product_id: productId,
            quantity: quantity
        })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error); });
        }
        return res.json();
    })
    .then(result => {
        // Menge zurücksetzen
        qtyInput.value = 1;
        // Bestellung neu laden
        reloadActiveOrderAndEditor(activeEditOrder.id);
    })
    .catch(err => alert("Fehler beim Hinzufügen des Artikels: " + err.message));
}

// Hilfsfunktion: Lädt eine einzelne Bestellung des Kunden neu und aktualisiert den Editor
function reloadActiveOrderAndEditor(orderId) {
    fetch(`../backend/api/admin_orders.php?user_id=${activeOrderEditCustomerId}`)
        .then(res => res.json())
        .then(orders => {
            const updatedOrder = orders.find(o => o.id === orderId);
            if (updatedOrder) {
                activeEditOrder = updatedOrder;
                renderOrderItemsEditor();
            }
        })
        .catch(err => console.error("Fehler beim Neuladen der Bestellung:", err));
}

// Dropdown für Produkte befüllen (für Bestellbearbeitungs-Selektor)
function loadProductsDropdown() {
    fetch('../backend/api/admin_products.php')
        .then(res => res.json())
        .then(products => {
            allProductsList = products;
            const select = document.getElementById('add-item-select');
            if (!select) return;

            select.innerHTML = '<option value="">-- Produkt auswählen --</option>';
            products.forEach(product => {
                const opt = document.createElement('option');
                opt.value = product.id;
                opt.textContent = `${product.name} (${parseFloat(product.price).toFixed(2)} €)`;
                select.appendChild(opt);
            });
        })
        .catch(err => console.error("Fehler beim Laden des Produkt-Dropdowns:", err));
}
