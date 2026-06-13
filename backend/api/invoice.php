<?php
// API zur Generierung von Rechnungsdaten (EasyElectronics)
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
$orderId = isset($_GET['order_id']) ? intval($_GET['order_id']) : 0;

if ($orderId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Ungültige Bestell-ID angegeben."]);
    exit;
}

$db = new DBAccess();
$conn = $db->connect();

try {
    // 1. Bestellung des Benutzers abrufen (inkl. Zahlungsart und Gutscheincode) (EPIC 8)
    $sqlOrder = "
        SELECT o.id, o.order_date, o.total_price, o.discount,
               p.provider AS payment_provider, p.details AS payment_details,
               v.code AS voucher_code,
               u.firstname, u.lastname, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN payment_methods p ON o.payment_method_id = p.id
        LEFT JOIN vouchers v ON o.voucher_id = v.id
        WHERE o.id = ? AND o.user_id = ?
    ";
    
    $stmtOrder = $conn->prepare($sqlOrder);
    $stmtOrder->execute([$orderId, $userId]);
    $order = $stmtOrder->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
        http_response_code(403);
        echo json_encode(["error" => "Zugriff verweigert oder Bestellung nicht gefunden."]);
        exit;
    }

    // 2. Artikel der Bestellung abrufen
    $sqlItems = "
        SELECT oi.quantity, oi.price AS purchase_price,
               p.name, p.category
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    ";
    
    $stmtItems = $conn->prepare($sqlItems);
    $stmtItems->execute([$orderId]);
    $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

    // 3. Rechnungsnummer generieren (Format: RE-Jahr-BestellID) (EPIC 8)
    $orderYear = date('Y', strtotime($order['order_date']));
    $invoiceNumber = "RE-" . $orderYear . "-" . str_pad($order['id'], 5, '0', STR_PAD_LEFT);

    // 4. Details maskieren für Zahlungsarten in der Rechnung
    $maskedPaymentDetails = $order['payment_details'];
    if ($order['payment_provider'] === 'Visa' || $order['payment_provider'] === 'MasterCard') {
        $clean = preg_replace('/\D/', '', $maskedPaymentDetails);
        if (strlen($clean) >= 4) {
            $maskedPaymentDetails = '•••• •••• •••• ' . substr($clean, -4);
        }
    }

    // 5. Rechnungsdaten-Struktur erstellen
    $invoiceData = [
        "invoice_number" => $invoiceNumber,
        "order_id" => intval($order['id']),
        "date" => $order['order_date'],
        "company" => [
            "name" => "EasyElectronics GmbH",
            "address" => "Technologiestraße 15",
            "city" => "1020 Wien",
            "email" => "support@easyelectronics.at",
            "website" => "www.easyelectronics.at",
            "vat_id" => "ATU12345678"
        ],
        "customer" => [
            "name" => $order['firstname'] . " " . $order['lastname'],
            "email" => $order['email']
        ],
        "payment" => [
            "provider" => $order['payment_provider'],
            "details" => $maskedPaymentDetails
        ],
        "voucher" => [
            "code" => $order['voucher_code'],
            "discount" => floatval($order['discount'])
        ],
        "items" => array_map(function($item) {
            $qty = intval($item['quantity']);
            $price = floatval($item['purchase_price']);
            return [
                "name" => $item['name'],
                "category" => $item['category'],
                "quantity" => $qty,
                "price" => $price,
                "line_total" => round($price * $qty, 2)
            ];
        }, $items),
        "subtotal" => round(floatval($order['total_price']) + floatval($order['discount']), 2),
        "total_price" => floatval($order['total_price'])
    ];

    echo json_encode($invoiceData);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Datenbankfehler beim Generieren der Rechnungsdaten: " . $e->getMessage()]);
}
?>
