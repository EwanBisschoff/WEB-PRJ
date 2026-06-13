-- Datenbank-Initialisierung für EasyElectronics Webshop

CREATE DATABASE IF NOT EXISTS `webshop` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `webshop`;

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `users`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `firstname` VARCHAR(100) NOT NULL,
  `lastname` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'user',
  `is_blocked` TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `products`
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `category` VARCHAR(100) NOT NULL,
  `rating` DECIMAL(3,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Daten für Tabelle `products`
-- --------------------------------------------------------
INSERT INTO `products` (`name`, `description`, `price`, `image`, `category`) VALUES
('QuantumPro ANC Kopfhörer', 'Premium Over-Ear Kopfhörer mit aktiver Geräuschunterdrückung, 40 Stunden Akkulaufzeit und Hi-Res Audio.', 189.99, 'quantum_pro.jpg', 'Audio'),
('ApexGlow Mechanische Tastatur', 'Mechanische Gaming-Tastatur mit anpassbarer RGB-Hintergrundbeleuchtung, Cherry MX Red Switches und Aluminium-Gehäuse.', 129.50, 'apex_glow.jpg', 'Elektronik'),
('AeroGlide Wireless Maus', 'Ultra-leichte kabellose Gaming-Maus mit 26K DPI optischem Sensor, 80 Stunden Akkulaufzeit und PTFE-Gleitfüßen.', 79.90, 'aeroglide_mouse.jpg', 'Elektronik'),
('Horizon 4K IPS Monitor', '27-Zoll Office & Gaming Monitor mit UHD 4K Auflösung, 144Hz Bildwiederholrate und HDR 400 Unterstützung.', 349.00, 'horizon_monitor.jpg', 'Elektronik'),
('Veloce Smartwatch Series 5', 'Elegante Fitness-Smartwatch mit AMOLED-Display, SpO2-Tracker, integriertem GPS und bis zu 10 Tagen Akkulaufzeit.', 219.00, 'veloce_watch.jpg', 'Elektronik'),
('StudioSonic Soundbar X3', 'Schlanke 2.1 Soundbar mit kabellosem Subwoofer, Dolby Atmos Unterstützung, Bluetooth 5.2 und HDMI eARC.', 159.00, 'studiosonic_soundbar.jpg', 'Audio'),
('AuraFlow RGB Mousepad', 'Großflächiges Gaming-Mauspad mit integrierter LED-Randbeleuchtung, wasserabweisender Oberfläche und rutschfester Basis.', 29.99, 'auraflow_pad.jpg', 'Elektronik'),
('SoundStream Portable Speaker', 'Kompakter, wasserdichter Bluetooth-Lautsprecher (IPX7) mit 360-Grad-Sound, 20W Leistung und 15 Stunden Spielzeit.', 49.95, 'soundstream_speaker.jpg', 'Audio')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `cart_items` (Warenkorb-Elemente)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `user_product` (`user_id`, `product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `payment_methods` (Gespeicherte Zahlungsarten)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `provider` VARCHAR(50) NOT NULL, -- z.B. 'Visa', 'MasterCard', 'PayPal'
  `details` VARCHAR(100) NOT NULL,  -- z.B. '•••• 4321' oder E-Mail
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `vouchers` (Gutscheine)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `value` DECIMAL(10,2) NOT NULL,          -- Aktueller Restwert
  `original_value` DECIMAL(10,2) NOT NULL, -- Ursprünglicher Betrag
  `is_redeemed` TINYINT(1) DEFAULT 0,       -- 1 = vollständig eingelöst
  `expiry_date` DATE DEFAULT NULL          -- Ablaufdatum (EPIC 9)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Daten für Tabelle `vouchers` (Gutscheine)
-- --------------------------------------------------------
INSERT INTO `vouchers` (`code`, `value`, `original_value`, `is_redeemed`) VALUES
('EASY-10', 10.00, 10.00, 0),
('EASY-50', 50.00, 50.00, 0),
('EASY-500', 500.00, 500.00, 0)
ON DUPLICATE KEY UPDATE `value`=VALUES(`value`), `original_value`=VALUES(`original_value`), `is_redeemed`=VALUES(`is_redeemed`);

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `orders` (Bestellungen)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `total_price` DECIMAL(10,2) NOT NULL,     -- Endpreis nach Abzügen
  `discount` DECIMAL(10,2) DEFAULT 0.00,    -- Eingelöster Gutscheinbetrag
  `voucher_id` INT DEFAULT NULL,
  `payment_method_id` INT NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Tabellenstruktur für Tabelle `order_items` (Bestelldetails)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,           -- Historischer Preis bei Bestellung
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
