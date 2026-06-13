<?php
// API zur Verwaltung von Profildaten des Benutzers (EasyElectronics)
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
$db = new DBAccess();
$conn = $db->connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Profildaten abrufen (ohne Passwort-Hash!)
    try {
        $stmt = $conn->prepare("SELECT id, firstname, lastname, email, username, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            echo json_encode($user);
        } else {
            http_response_code(404);
            echo json_encode(["error" => "Benutzer nicht gefunden."]);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Laden des Profils: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Profildaten aktualisieren (Passwort-Bestätigung erforderlich)
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $firstname = trim($input['firstname'] ?? '');
    $lastname = trim($input['lastname'] ?? '');
    $email = trim($input['email'] ?? '');
    $username = trim($input['username'] ?? '');
    $currentPassword = $input['current_password'] ?? '';

    // Validierung der Eingaben
    if (empty($firstname) || empty($lastname) || empty($email) || empty($username) || empty($currentPassword)) {
        http_response_code(400);
        echo json_encode(["error" => "Alle Felder sowie das aktuelle Passwort sind erforderlich."]);
        exit;
    }

    try {
        // 1. Überprüfen, ob E-Mail oder Benutzername bereits vergeben sind (außer vom aktuellen Benutzer)
        $stmtCheck = $conn->prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?");
        $stmtCheck->execute([$username, $email, $userId]);
        if ($stmtCheck->fetch()) {
            http_response_code(400);
            echo json_encode(["error" => "Benutzername oder E-Mail-Adresse wird bereits von einem anderen Konto verwendet."]);
            exit;
        }

        // 2. Passwort verifizieren
        $stmtPass = $conn->prepare("SELECT password FROM users WHERE id = ?");
        $stmtPass->execute([$userId]);
        $storedHash = $stmtPass->fetchColumn();

        if (!$storedHash || !password_verify($currentPassword, $storedHash)) {
            http_response_code(401);
            echo json_encode(["error" => "Das eingegebene aktuelle Passwort ist ungültig."]);
            exit;
        }

        // 3. Daten in Datenbank aktualisieren (EPIC 8)
        $stmtUpdate = $conn->prepare("
            UPDATE users 
            SET firstname = ?, lastname = ?, email = ?, username = ? 
            WHERE id = ?
        ");
        $stmtUpdate->execute([$firstname, $lastname, $email, $username, $userId]);

        // 4. Session-Daten aktualisieren
        $_SESSION['user']['firstname'] = $firstname;
        $_SESSION['user']['lastname'] = $lastname;
        $_SESSION['user']['email'] = $email;
        $_SESSION['user']['username'] = $username;

        echo json_encode([
            "success" => true,
            "message" => "Profildaten wurden erfolgreich aktualisiert.",
            "username" => $username
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Aktualisieren des Profils: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}
?>
