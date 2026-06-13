<?php
// API für Gutschein-Administration (EasyElectronics)
session_start();

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

// Überprüfen, ob der Benutzer angemeldet und ein Administrator ist (EPIC 9)
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Zugriff verweigert. Nur für Administratoren."]);
    exit;
}

$db = new DBAccess();
$conn = $db->connect();
$method = $_SERVER['REQUEST_METHOD'];

// Hilfsfunktion: Gutscheincode generieren (5-stellig, alphanumerisch) (EPIC 9)
function generateRandomCode($length = 5) {
    $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= $characters[rand(0, strlen($characters) - 1)];
    }
    return $code;
}

if ($method === 'GET') {
    // Gutscheine abrufen und ihren Status berechnen (EPIC 9)
    try {
        $stmt = $conn->prepare("SELECT id, code, value, original_value, is_redeemed, expiry_date FROM vouchers ORDER BY id DESC");
        $stmt->execute();
        $vouchers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $currentDate = date('Y-m-d');
        foreach ($vouchers as &$voucher) {
            $value = floatval($voucher['value']);
            $isRedeemed = intval($voucher['is_redeemed']);
            $expiry = $voucher['expiry_date'];
            
            // Status-Ermittlung (aktiv / abgelaufen / eingelöst)
            if ($isRedeemed === 1 || $value <= 0.0) {
                $status = 'eingelöst';
            } elseif ($expiry !== null && $expiry < $currentDate) {
                $status = 'abgelaufen';
            } else {
                $status = 'aktiv';
            }
            
            $voucher['status'] = $status;
            $voucher['value'] = round($value, 2);
            $voucher['original_value'] = round(floatval($voucher['original_value']), 2);
        }
        
        echo json_encode($vouchers);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Laden der Gutscheine: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Neuen Gutschein anlegen (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $code = trim($input['code'] ?? '');
    $value = floatval($input['value'] ?? 0.0);
    $expiryDate = isset($input['expiry_date']) && !empty($input['expiry_date']) ? $input['expiry_date'] : null;

    if ($value <= 0.0) {
        http_response_code(400);
        echo json_encode(["error" => "Der Gutscheinwert muss größer als 0 sein."]);
        exit;
    }

    // Wenn kein Code angegeben, einen 5-stelligen generieren (EPIC 9)
    if (empty($code)) {
        $code = generateRandomCode(5);
    } else {
        $code = strtoupper($code);
        // Validieren, dass der Code 5-stellig und alphanumerisch ist (oder zumindest gültig)
        if (strlen($code) !== 5) {
            http_response_code(400);
            echo json_encode(["error" => "Der Gutscheincode muss genau 5 Zeichen lang sein."]);
            exit;
        }
    }

    try {
        // Prüfen, ob der Code bereits existiert
        $stmtCheck = $conn->prepare("SELECT id FROM vouchers WHERE code = ?");
        $stmtCheck->execute([$code]);
        if ($stmtCheck->fetch()) {
            http_response_code(400);
            echo json_encode(["error" => "Der Gutscheincode '$code' existiert bereits."]);
            exit;
        }

        // Gutschein speichern (EPIC 9)
        $stmt = $conn->prepare("
            INSERT INTO vouchers (code, value, original_value, is_redeemed, expiry_date)
            VALUES (?, ?, ?, 0, ?)
        ");
        $stmt->execute([$code, $value, $value, $expiryDate]);
        
        echo json_encode([
            "success" => true,
            "message" => "Gutschein '$code' erfolgreich angelegt.",
            "voucher" => [
                "id" => $conn->lastInsertId(),
                "code" => $code,
                "value" => $value,
                "original_value" => $value,
                "expiry_date" => $expiryDate,
                "status" => ($expiryDate !== null && $expiryDate < date('Y-m-d')) ? 'abgelaufen' : 'aktiv'
            ]
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Speichern des Gutscheins: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    // Gutschein löschen (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    $voucherId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);

    if ($voucherId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Gutschein-ID."]);
        exit;
    }

    try {
        $stmt = $conn->prepare("DELETE FROM vouchers WHERE id = ?");
        $stmt->execute([$voucherId]);
        
        echo json_encode([
            "success" => true,
            "message" => "Gutschein erfolgreich gelöscht."
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Löschen des Gutscheins: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}
?>
