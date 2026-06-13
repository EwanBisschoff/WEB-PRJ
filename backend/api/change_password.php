<?php
// API zum Ändern des Benutzerpassworts (EasyElectronics)
session_start();

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

// Überprüfen, ob der Benutzer angemeldet ist
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(["error" => "Nicht autorisiert. Bitte anmelden."]);
    exit;
}

$userId = intval($_SESSION['user']['id']);

$input = json_decode(file_get_contents("php://input"), true);
if (!$input) {
    $input = $_POST;
}

$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';

if (empty($currentPassword) || empty($newPassword)) {
    http_response_code(400);
    echo json_encode(["error" => "Das aktuelle und das neue Passwort müssen angegeben werden."]);
    exit;
}

if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode(["error" => "Das neue Passwort muss mindestens 6 Zeichen lang sein."]);
    exit;
}

$db = new DBAccess();
$conn = $db->connect();

try {
    // 1. Aktuelles Passwort aus Datenbank abrufen
    $stmtPass = $conn->prepare("SELECT password FROM users WHERE id = ?");
    $stmtPass->execute([$userId]);
    $storedHash = $stmtPass->fetchColumn();

    // 2. Passwort verifizieren
    if (!$storedHash || !password_verify($currentPassword, $storedHash)) {
        http_response_code(401);
        echo json_encode(["error" => "Das eingegebene aktuelle Passwort ist ungültig."]);
        exit;
    }

    // 3. Neues Passwort hashen und in Datenbank aktualisieren (EPIC 8)
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmtUpdate = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmtUpdate->execute([$newHash, $userId]);

    echo json_encode([
        "success" => true,
        "message" => "Ihr Passwort wurde erfolgreich geändert."
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Datenbankfehler beim Ändern des Passworts: " . $e->getMessage()]);
}
?>
