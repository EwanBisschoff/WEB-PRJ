<?php
// API zur Abfrage der Bestellhistorie des Benutzers (EasyElectronics)
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

try {
    // 1. Alle Bestellungen des Benutzers abrufen (inkl. Zahlungsart und Gutscheincode)
    $sqlOrders = "
        SELECT o.id, o.order_date, o.total_price, o.discount,
               p.provider AS payment_provider, p.details AS payment_details,
               v.code AS voucher_code
        FROM orders o
        JOIN payment_methods p ON o.payment_method_id = p.id
        LEFT JOIN vouchers v ON o.voucher_id = v.id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
    ";
    
    $stmtOrders = $conn->prepare($sqlOrders);
    $stmtOrders->execute([$userId]);
    $orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);

    $ordersHistory = [];

    // 2. Für jede Bestellung die einzelnen Artikel abrufen
    foreach ($orders as $order) {
        $orderId = intval($order['id']);
        
        $sqlItems = "
            SELECT oi.id, oi.quantity, oi.price AS purchase_price,
                   p.name, p.category, p.image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        ";
        
        $stmtItems = $conn->prepare($sqlItems);
        $stmtItems->execute([$orderId]);
        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

        $ordersHistory[] = [
            "id" => $orderId,
            "order_date" => $order['order_date'],
            "total_price" => floatval($order['total_price']),
            "discount" => floatval($order['discount']),
            "payment" => [
                "provider" => $order['payment_provider'],
                "details" => $order['payment_details']
            ],
            "voucher_code" => $order['voucher_code'],
            "items" => array_map(function($item) {
                return [
                    "id" => intval($item['id']),
                    "name" => $item['name'],
                    "category" => $item['category'],
                    "image" => $item['image'],
                    "quantity" => intval($item['quantity']),
                    "price" => floatval($item['purchase_price']),
                    "line_total" => round(floatval($item['purchase_price']) * intval($item['quantity']), 2)
                ];
            }, $items)
        ];
    }

    echo json_encode($ordersHistory);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Datenbankfehler beim Laden der Bestellungen: " . $e->getMessage()]);
}
?>
