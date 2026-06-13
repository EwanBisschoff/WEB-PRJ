<?php
// Datenbankzugriffsklasse (EasyElectronics)

class DBAccess {

    public function connect() {
        // Standardkonfiguration für XAMPP (lokale Standard-Verbindung)
        $host = '127.0.0.1';
        $port = '3306';
        $dbname = 'webshop';
        $user = 'root';
        $pass = '';

        // 1. Überschreiben mit Umgebungsvariablen (für Docker, CI/CD oder Webserver-Konfigurationen)
        if (getenv('DB_HOST') !== false) {
            $host = getenv('DB_HOST');
        }
        if (getenv('DB_PORT') !== false) {
            $port = getenv('DB_PORT');
        }
        if (getenv('DB_NAME') !== false) {
            $dbname = getenv('DB_NAME');
        }
        if (getenv('DB_USER') !== false) {
            $user = getenv('DB_USER');
        }
        if (getenv('DB_PASS') !== false) {
            $pass = getenv('DB_PASS');
        }

        // 2. Überschreiben mit einer lokalen Konfigurationsdatei (falls vorhanden)
        // Ermöglicht es Entwicklern auf anderen Systemen (z. B. mit MAMP/WAMP oder anderen Passwörtern)
        // ihre Einstellungen anzupassen, ohne den git-kontrollierten Code ändern zu müssen.
        $localConfigFile = __DIR__ . '/dbaccess.local.php';
        if (file_exists($localConfigFile)) {
            $localConfig = include $localConfigFile;
            if (is_array($localConfig)) {
                if (isset($localConfig['host'])) $host = $localConfig['host'];
                if (isset($localConfig['port'])) $port = $localConfig['port'];
                if (isset($localConfig['dbname'])) $dbname = $localConfig['dbname'];
                if (isset($localConfig['user'])) $user = $localConfig['user'];
                if (isset($localConfig['pass'])) $pass = $localConfig['pass'];
            }
        }

        try {
            // DSN mit UTF-8 Zeichensatz erstellen
            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
            
            $pdo = new PDO($dsn, $user, $pass);
            
            // Fehlermodus auf Exception setzen
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            return $pdo;
        } catch(PDOException $e) {
            // Fehlermeldung ausgeben und Skript beenden
            die("Datenbankverbindung fehlgeschlagen: " . $e->getMessage());
        }
    }
}
?>