<?php
// API zur Überprüfung und Berechnung von Gutscheinen (EasyElectronics)
session_start();

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

// Überprüfen, ob der Benutzer angemeldet ist
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(["error" => "Nicht autorisiert. Bitte anmelden."]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (!$input) {
    $input = $_POST;
}

$code = trim($input['code'] ?? '');
$totalPrice = floatval($input['total_price'] ?? 0.0);

if (empty($code)) {
    http_response_code(400);
    echo json_encode(["error" => "Gutscheincode ist erforderlich."]);
    exit;
}

if ($totalPrice <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Ungültiger Bestellwert."]);
    exit;
}

$db = new DBAccess();
$conn = $db->connect();

try {
    // Gutschein aus DB abrufen
    $stmt = $conn->prepare("SELECT id, code, value, original_value, is_redeemed FROM vouchers WHERE code = ?");
    $stmt->execute([$code]);
    $voucher = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$voucher) {
        http_response_code(404);
        echo json_encode(["error" => "Gutscheincode ist ungültig."]);
        exit;
    }

    if (intval($voucher['is_redeemed']) === 1 || floatval($voucher['value']) <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Dieser Gutschein wurde bereits vollständig eingelöst."]);
        exit;
    }

    $voucherValue = floatval($voucher['value']);
    $discount = 0.0;
    $finalPrice = 0.0;
    $remainingValue = 0.0;

    // Berechnung des Rabatts und des verbleibenden Gutscheinwerts
    if ($voucherValue >= $totalPrice) {
        // Gutschein deckt die gesamte Summe oder mehr
        $discount = $totalPrice;
        $finalPrice = 0.0;
        $remainingValue = $voucherValue - $totalPrice;
    } else {
        // Gutschein deckt nur einen Teil der Summe ab
        $discount = $voucherValue;
        $finalPrice = $totalPrice - $voucherValue;
        $remainingValue = 0.0;
    }

    echo json_encode([
        "success" => true,
        "voucher" => [
            "id" => intval($voucher['id']),
            "code" => $voucher['code'],
            "value" => $voucherValue,
            "original_value" => floatval($voucher['original_value'])
        ],
        "calculation" => [
            "original_total" => round($totalPrice, 2),
            "discount" => round($discount, 2),
            "final_total" => round($finalPrice, 2),
            "remaining_voucher_value" => round($remainingValue, 2)
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Datenbankfehler beim Laden des Gutscheins: " . $e->getMessage()]);
}
?>
