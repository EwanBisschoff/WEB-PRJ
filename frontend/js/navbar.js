/**
 * @fileoverview Globaler Header & Navbar Controller (EasyElectronics)
 */

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

    // Alle aktiven CSS Klassen entfernen
    const allLinks = document.querySelectorAll('.nav-links a');
    allLinks.forEach(link => link.classList.remove('active'));

    // Richtigen Link aktivieren
    if (page === 'index.html' || page === '') {
        const homeLink = document.getElementById('nav-home');
        if (homeLink) homeLink.classList.add('active');
    } else if (page === 'login.html') {
        const loginLink = document.getElementById('nav-login');
        if (loginLink) loginLink.classList.add('active');
    } else if (page === 'register.html') {
        const registerLink = document.getElementById('nav-register');
        if (registerLink) registerLink.classList.add('active');
    } else if (page === 'account.html') {
        const accountLink = document.getElementById('nav-account');
        if (accountLink) accountLink.classList.add('active');
    } else if (page === 'admin.php') {
        const activeLink = document.getElementById('nav-admin');
        if (activeLink) activeLink.classList.add('active');
    }
}

// Global verfügbarer Funktion zur Aktualisierung des Badges
window.refreshCartBadge = function() {
    fetch('../backend/api/cart.php')
        .then(res => res.json())
        .then(({ total_items }) => {
            window.updateCartBadge(total_items);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action:     'add',
            product_id: parseInt(productId)
        })
    })
    .then(res => res.json())
    .then(({ error, total_items }) => {
        if (error) {
            console.error(error);
        } else {
            window.updateCartBadge(total_items);

            // Falls wir uns auf der Warenkorb-Seite befinden, laden wir diese ebenfalls neu
            if (window.location.pathname.includes('cart.html') && typeof window.loadCartItems === 'function') {
                window.loadCartItems();
            }
        }
    })
    .catch(err => console.error("Fehler beim Hinzufügen des Produkts via Drag:", err));
}

// Prüft den Anmeldestatus und passt die Navigation dynamisch an (EPIC 7 / Alignment)
function checkSessionState(container) {
    fetch('../backend/api/session.php')
        .then(res => res.json())
        .then(({ loggedIn, role, username }) => {
            const navLinks    = container.querySelector('.nav-links');
            const cartDropzone = container.querySelector('#cart-dropzone');
            if (!navLinks) return;

            // Navigationslinks zurücksetzen und basierend auf dem Status neu aufbauen
            // noinspection HtmlUnknownTarget
            navLinks.innerHTML = '<li><a href="index.html" id="nav-home">Home</a></li>';

            if (loggedIn) {
                if (role === 'admin') {
                    // Admin sieht: Home, Admin, Mein Konto, greeting, Logout (kein Warenkorb!)
                    navLinks.insertAdjacentHTML('beforeend', `
                        <li><a href="../backend/admin.php" id="nav-admin">Admin</a></li>
                        <li><a href="account.html" id="nav-account">Mein Konto</a></li>
                        <li class="nav-user-greeting" style="color: var(--text-primary); font-weight: 500; padding: 8px 16px;">Hallo, ${username}!</li>
                        <li><a href="#" id="nav-logout" style="color: var(--danger-color); cursor: pointer;">Abmelden</a></li>
                    `);

                    // Warenkorb ausblenden
                    if (cartDropzone) cartDropzone.style.display = 'none';
                } else {
                    // Eingeloggter Kunde sieht: Home, Produkte, Mein Konto, Warenkorb (und Logout)
                    // noinspection HtmlUnknownTarget
                    navLinks.insertAdjacentHTML('beforeend', `
                        <li><a href="index.html" id="nav-products">Produkte</a></li>
                        <li><a href="account.html" id="nav-account">Mein Konto</a></li>
                        <li class="nav-user-greeting" style="color: var(--text-primary); font-weight: 500; padding: 8px 16px;">Hallo, ${username}!</li>
                        <li><a href="#" id="nav-logout" style="color: var(--danger-color); cursor: pointer;">Abmelden</a></li>
                    `);

                    if (cartDropzone) cartDropzone.style.display = 'flex';
                }

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
            } else {
                // Gast sieht: Home, Produkte, Login, Registrierung (und Warenkorb)
                // noinspection HtmlUnknownTarget
                navLinks.insertAdjacentHTML('beforeend', `
                    <li><a href="index.html" id="nav-products">Produkte</a></li>
                    <li><a href="login.html" id="nav-login">Login</a></li>
                    <li><a href="register.html" id="nav-register">Registrierung</a></li>
                `);

                if (cartDropzone) cartDropzone.style.display = 'flex';
            }

            // Aktiven Zustand markieren
            highlightActiveLink();
        })
        .catch(err => console.error("Fehler bei der Session-Abfrage:", err));
}
