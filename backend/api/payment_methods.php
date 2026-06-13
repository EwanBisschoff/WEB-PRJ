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

// Hilfsfunktion: Sensible Daten je nach Anbieter maskieren (EPIC 8)
function maskDetails($provider, $details) {
    $details = trim($details);
    if (empty($details)) return '';
    
    // Wenn die Details bereits maskiert sind (beginnen mit •)
    if (strpos($details, '•') !== false) {
        return $details;
    }

    if ($provider === 'Visa' || $provider === 'MasterCard') {
        // Kreditkarte maskieren (nur letzte 4 Ziffern anzeigen)
        $clean = preg_replace('/\D/', '', $details);
        if (strlen($clean) >= 4) {
            return '•••• •••• •••• ' . substr($clean, -4);
        }
    } elseif ($provider === 'PayPal') {
        // PayPal E-Mail maskieren (z. B. u••••r@domain.com)
        $parts = explode('@', $details);
        if (count($parts) === 2) {
            $name = $parts[0];
            $domain = $parts[1];
            $len = strlen($name);
            if ($len > 2) {
                $maskedName = substr($name, 0, 1) . str_repeat('•', $len - 2) . substr($name, -1);
            } else {
                $maskedName = str_repeat('•', $len);
            }
            return $maskedName . '@' . $domain;
        }
    } elseif ($provider === 'Bankeinzug') {
        // IBAN maskieren (DE89 •••• •••• •••• •••• 12)
        $clean = preg_replace('/\s+/', '', $details);
        $len = strlen($clean);
        if ($len >= 6) {
            return substr($clean, 0, 4) . ' ' . str_repeat('•••• ', 4) . substr($clean, -2);
        }
    }
    
    return $details;
}

if ($method === 'GET') {
    // Alle gespeicherten Zahlungsarten abrufen und maskieren (EPIC 8)
    try {
        $stmt = $conn->prepare("SELECT id, provider, details FROM payment_methods WHERE user_id = ?");
        $stmt->execute([$userId]);
        $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Sensible Daten maskieren
        foreach ($methods as &$methodItem) {
            $methodItem['details'] = maskDetails($methodItem['provider'], $methodItem['details']);
        }
        
        echo json_encode($methods);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Laden der Zahlungsarten: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Eine neue Zahlungsart hinzufügen (sensible Daten werden bei der Ausgabe maskiert)
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
        
        $newId = $conn->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Zahlungsart erfolgreich hinzugefügt.",
            "payment_method" => [
                "id" => $newId,
                "provider" => $provider,
                "details" => maskDetails($provider, $details)
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Speichern der Zahlungsart: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    // Eine Zahlungsart löschen (EPIC 8)
    $input = json_decode(file_get_contents("php://input"), true);
    $payId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);

    if ($payId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Zahlungsart-ID angegeben."]);
        exit;
    }

    try {
        // Prüfen, ob die Zahlungsart wirklich dem Benutzer gehört
        $stmtCheck = $conn->prepare("SELECT id FROM payment_methods WHERE id = ? AND user_id = ?");
        $stmtCheck->execute([$payId, $userId]);
        
        if (!$stmtCheck->fetch()) {
            http_response_code(403);
            echo json_encode(["error" => "Zugriff verweigert oder Zahlungsart nicht gefunden."]);
            exit;
        }

        // Löschen ausführen
        $stmtDel = $conn->prepare("DELETE FROM payment_methods WHERE id = ?");
        $stmtDel->execute([$payId]);

        echo json_encode([
            "success" => true,
            "message" => "Zahlungsart erfolgreich gelöscht."
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Löschen der Zahlungsart: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}
?>
