<?php
// API zur Abmeldung (EasyElectronics)
session_start();
require_once '../config/dbaccess.php';

// Falls angemeldet, den Remember-Token in der DB löschen (EPIC 9 / Cookie)
if (isset($_SESSION['user'])) {
    $userId = intval($_SESSION['user']['id']);
    $db = new DBAccess();
    $conn = $db->connect();
    try {
        $stmt = $conn->prepare("UPDATE users SET remember_token = NULL WHERE id = ?");
        $stmt->execute([$userId]);
    } catch (PDOException $e) {
        // Fehler stillschweigend ignorieren
    }
}

// Cookie auf dem Client löschen
if (isset($_COOKIE['remember_token'])) {
    setcookie('remember_token', '', time() - 3600, '/');
}

// Session zerstören
session_unset();
session_destroy();

header('Content-Type: application/json');
echo json_encode(["success" => true, "message" => "Erfolgreich abgemeldet"]);
?>