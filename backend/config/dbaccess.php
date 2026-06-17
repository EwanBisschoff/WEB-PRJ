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