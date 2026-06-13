<?php
// API zur Verwaltung von gespeicherten Zahlungsarten (EasyElectronics)
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
    // Alle gespeicherten Zahlungsarten für diesen Benutzer abrufen
    try {
        $stmt = $conn->prepare("SELECT id, provider, details FROM payment_methods WHERE user_id = ?");
        $stmt->execute([$userId]);
        $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($methods);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Laden der Zahlungsarten: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Eine neue Zahlungsart für diesen Benutzer hinzufügen
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $provider = trim($input['provider'] ?? '');
    $details = trim($input['details'] ?? '');

    if (empty($provider) || empty($details)) {
        http_response_code(400);
        echo json_encode(["error" => "Anbieter und Details sind erforderliche Felder."]);
        exit;
    }

    try {
        $stmt = $conn->prepare("INSERT INTO payment_methods (user_id, provider, details) VALUES (?, ?, ?)");
        $stmt->execute([$userId, $provider, $details]);
        
        // Neu erstellte Zahlungsart zurückliefern
        $newId = $conn->lastInsertId();
        echo json_encode([
            "success" => true,
            "message" => "Zahlungsart erfolgreich hinzugefügt.",
            "payment_method" => [
                "id" => $newId,
                "provider" => $provider,
                "details" => $details
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Speichern der Zahlungsart: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}
?>
