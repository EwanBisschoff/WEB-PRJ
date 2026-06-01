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
  `role` VARCHAR(50) NOT NULL DEFAULT 'user'
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
  `category` VARCHAR(100) NOT NULL
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
('SoundStream Portable Speaker', 'Kompakter, wasserdichter Bluetooth-Lautsprecher (IPX7) mit 360-Grad-Sound, 20W Leistung und 15 Stunden Spielzeit.', 49.95, 'soundstream_speaker.jpg', 'Audio');
