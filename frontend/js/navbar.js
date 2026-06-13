// Globaler Header & Navbar Controller (EasyElectronics)

document.addEventListener("DOMContentLoaded", () => {
    // 1. Navbar-Container automatisch erstellen, falls nicht vorhanden
    let container = document.getElementById("navbar-container");
    if (!container) {
        container = document.createElement("header");
        container.id = "navbar-container";
        document.body.insertBefore(container, document.body.firstChild);
    }

    // 2. navbar.html per AJAX laden
    fetch('navbar.html')
        .then(response => {
            if (!response.ok) {
                // Relativer Pfad-Fallback für Unterverzeichnisse
                return fetch('navbar.html');
            }
            return response;
        })
        .then(response => response.text())
        .then(html => {
            container.innerHTML = html;
            highlightActiveLink();
            initDragAndDrop();
            refreshCartBadge();
            checkSessionState(container);
        })
        .catch(err => console.error("Fehler beim Laden der Navbar:", err));
});

// Funktion zum Hervorheben des aktiven Links
function highlightActiveLink() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1);

    // Alle Links zurücksetzen
    const links = {
        'index.html': document.getElementById('nav-home'),
        'login.html': document.getElementById('nav-login'),
        'register.html': document.getElementById('nav-register')
    };

    // Standardmäßig Home aktivieren
    let activeLink = links['index.html'];

    if (page === 'login.html') {
        activeLink = links['login.html'];
    } else if (page === 'register.html') {
        activeLink = links['register.html'];
    } else if (page === 'cart.html') {
        // Warenkorb aktiv -> Icon-Button leuchtend machen
        const cartBtn = document.getElementById('cart-dropzone');
        if (cartBtn) cartBtn.style.background = 'var(--primary-color)';
        activeLink = null;
    }

    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Global verfügbarer Funktion zur Aktualisierung des Badges
window.refreshCartBadge = function() {
    fetch('../backend/api/cart.php')
        .then(res => res.json())
        .then(cart => {
            window.updateCartBadge(cart.total_items);
        })
        .catch(err => console.error("Fehler beim Laden des Warenkorb-Zählers:", err));
};

// Global verfügbare Funktion zur visuellen Animation und Änderung des Badges
window.updateCartBadge = function(count) {
    const badge = document.getElementById('cart-count');
    if (badge) {
        const oldCount = parseInt(badge.textContent) || 0;
        badge.textContent = count;

        // Wenn sich die Anzahl erhöht hat, Bouncing-Animation triggern
        if (count !== oldCount) {
            badge.classList.remove('pop-animation');
            void badge.offsetWidth; // Reflow triggern zur Animation-Reinitialisierung
            badge.classList.add('pop-animation');
        }
    }
};

// Drag & Drop Initialisierung auf dem Warenkorb-Icon
function initDragAndDrop() {
    const dropzone = document.getElementById('cart-dropzone');
    if (!dropzone) return;

    // dragover: Verhindert Standardverhalten, um das Ablegen zu ermöglichen
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
    });

    // dragleave: Entfernt das optische Highlight
    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
    });

    // drop: Liest Daten aus und fügt Produkt hinzu
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');

        const productId = e.dataTransfer.getData('text/plain');
        if (productId) {
            addProductToCartViaDrag(productId);
        }
    });
}

// AJAX-Call zum Hinzufügen bei Drag & Drop
function addProductToCartViaDrag(productId) {
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
            console.error(cart.error);
        } else {
            window.updateCartBadge(cart.total_items);
            
            // Falls wir uns auf der Warenkorb-Seite befinden, laden wir diese ebenfalls neu
            if (window.location.pathname.includes('cart.html') && typeof window.loadCartItems === 'function') {
                window.loadCartItems();
            }
        }
    })
    .catch(err => console.error("Fehler beim Hinzufügen des Produkts via Drag:", err));
}

// Prüft den Anmeldestatus und passt die Navigation dynamisch an (EPIC 7)
function checkSessionState(container) {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(session => {
            const navLinks = container.querySelector('.nav-links');
            if (!navLinks) return;

            if (session.loggedIn) {
                // Login und Registrierung aus der Liste entfernen
                const loginLink = container.querySelector('#nav-login');
                const registerLink = container.querySelector('#nav-register');
                if (loginLink) loginLink.parentElement.remove();
                if (registerLink) registerLink.parentElement.remove();

                // Admin Link prüfen (EPIC 9)
                let adminLinkHtml = '';
                if (session.role === 'admin') {
                    adminLinkHtml = `<li><a href="admin.php" id="nav-admin">Admin-Bereich</a></li>`;
                }

                // Eigene Links und Begrüßung für eingeloggten Benutzer hinzufügen
                navLinks.insertAdjacentHTML('beforeend', `
                    ${adminLinkHtml}
                    <li><a href="account.html" id="nav-account">Mein Konto</a></li>
                    <li class="nav-user-greeting" style="color: var(--text-primary); font-weight: 500; padding: 8px 16px;">Hallo, ${session.username}!</li>
                    <li><a href="#" id="nav-logout" style="color: var(--danger-color); cursor: pointer;">Abmelden</a></li>
                `);

                // Klick-Event für Logout-Link
                const logoutBtn = container.querySelector('#nav-logout');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        fetch('../backend/api/logout.php')
                            .then(() => {
                                window.location.href = 'index.html';
                            })
                            .catch(err => console.error("Fehler beim Abmelden:", err));
                    });
                }
                
                // Aktiven Zustand markieren
                const path = window.location.pathname;
                const page = path.substring(path.lastIndexOf('/') + 1);
                if (page === 'account.html') {
                    const accountLink = container.querySelector('#nav-account');
                    if (accountLink) accountLink.classList.add('active');
                } else if (page === 'admin.php') {
                    const adminLink = container.querySelector('#nav-admin');
                    if (adminLink) adminLink.classList.add('active');
                }
            }
        })
        .catch(err => console.error("Fehler bei der Session-Abfrage:", err));
}
