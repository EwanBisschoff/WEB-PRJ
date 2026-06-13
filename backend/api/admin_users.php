<?php
// API für Benutzer-Administration (EasyElectronics)
session_start();

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

// Überprüfen, ob der Benutzer angemeldet und ein Administrator ist (EPIC 9)
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Zugriff verweigert. Nur für Administratoren."]);
    exit;
}

$adminId = intval($_SESSION['user']['id']);
$db = new DBAccess();
$conn = $db->connect();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Liste aller Kundenkonten abrufen (EPIC 9)
    try {
        $stmt = $conn->prepare("SELECT id, firstname, lastname, email, username, role, is_blocked FROM users ORDER BY id ASC");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($users);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Laden der Kunden: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Sperren / Entsperren eines Kunden (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $targetUserId = isset($input['user_id']) ? intval($input['user_id']) : 0;
    $action = trim($input['action'] ?? ''); // 'block' oder 'unblock'

    if ($targetUserId <= 0 || !in_array($action, ['block', 'unblock'])) {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Parameter. user_id und Aktion (block/unblock) sind erforderlich."]);
        exit;
    }

    // Sicherstellen, dass Administratoren sich nicht selbst sperren (EPIC 9)
    if ($targetUserId === $adminId) {
        http_response_code(400);
        echo json_encode(["error" => "Sie können Ihr eigenes Administrator-Konto nicht sperren."]);
        exit;
    }

    try {
        // Überprüfen, ob der Zielbenutzer existiert
        $stmtCheck = $conn->prepare("SELECT role FROM users WHERE id = ?");
        $stmtCheck->execute([$targetUserId]);
        $targetUser = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$targetUser) {
            http_response_code(444);
            echo json_encode(["error" => "Der Benutzer wurde nicht gefunden."]);
            exit;
        }

        // Sperr-Status in Datenbank ändern (EPIC 9)
        $isBlocked = ($action === 'block') ? 1 : 0;
        $stmtUpdate = $conn->prepare("UPDATE users SET is_blocked = ? WHERE id = ?");
        $stmtUpdate->execute([$isBlocked, $targetUserId]);

        // Falls gesperrt, beenden wir eventuelle aktive Sessions des Benutzers (in einer echten DB-Session-Umgebung. Hier wird beim nächsten Request das Login abgefangen).
        
        $msg = ($action === 'block') ? "Benutzerkonto erfolgreich gesperrt." : "Benutzerkonto erfolgreich entsperrt.";
        echo json_encode([
            "success" => true,
            "message" => $msg,
            "is_blocked" => $isBlocked
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Ändern des Sperrstatus: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}
?>
