<?php
// API für Bestellungs-Administration (EasyElectronics)
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

if ($method === 'GET') {
    // Bestellungen eines bestimmten Kunden abrufen (EPIC 9)
    $targetUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    if ($targetUserId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Kunden-ID angegeben."]);
        exit;
    }

    try {
        // 1. Alle Bestellungen des Benutzers abrufen
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
        $stmtOrders->execute([$targetUserId]);
        $orders = $stmtOrders->fetchAll(PDO::FETCH_ASSOC);

        $ordersList = [];

        // 2. Artikel für jede Bestellung laden
        foreach ($orders as $order) {
            $orderId = intval($order['id']);
            
            $sqlItems = "
                SELECT oi.id AS order_item_id, oi.product_id, oi.quantity, oi.price AS purchase_price,
                       p.name, p.category
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                WHERE oi.order_id = ?
            ";
            
            $stmtItems = $conn->prepare($sqlItems);
            $stmtItems->execute([$orderId]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            $ordersList[] = [
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
                        "order_item_id" => intval($item['order_item_id']),
                        "product_id" => intval($item['product_id']),
                        "name" => $item['name'],
                        "category" => $item['category'],
                        "quantity" => intval($item['quantity']),
                        "price" => floatval($item['purchase_price']),
                        "line_total" => round(floatval($item['purchase_price']) * intval($item['quantity']), 2)
                    ];
                }, $items)
            ];
        }

        echo json_encode($ordersList);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Abrufen der Bestellungen: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Artikel zu einer Bestellung hinzufügen oder Menge erhöhen (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $orderId = isset($input['order_id']) ? intval($input['order_id']) : 0;
    $productId = isset($input['product_id']) ? intval($input['product_id']) : 0;
    $quantity = isset($input['quantity']) ? intval($input['quantity']) : 1;

    if ($orderId <= 0 || $productId <= 0 || $quantity <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "order_id, product_id und quantity sind erforderlich."]);
        exit;
    }

    try {
        $conn->beginTransaction();

        // 1. Überprüfen, ob Bestellung existiert
        $stmtOrderCheck = $conn->prepare("SELECT id, discount FROM orders WHERE id = ? FOR UPDATE");
        $stmtOrderCheck->execute([$orderId]);
        $order = $stmtOrderCheck->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(["error" => "Bestellung nicht gefunden."]);
            exit;
        }

        // 2. Produktpreis holen
        $stmtProd = $conn->prepare("SELECT price FROM products WHERE id = ?");
        $stmtProd->execute([$productId]);
        $price = $stmtProd->fetchColumn();

        if ($price === false) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(["error" => "Produkt nicht gefunden."]);
            exit;
        }

        $price = floatval($price);

        // 3. Prüfen, ob das Produkt bereits in der Bestellung vorhanden ist
        $stmtItemCheck = $conn->prepare("SELECT id, quantity FROM order_items WHERE order_id = ? AND product_id = ?");
        $stmtItemCheck->execute([$orderId, $productId]);
        $existingItem = $stmtItemCheck->fetch(PDO::FETCH_ASSOC);

        if ($existingItem) {
            // Menge erhöhen
            $stmtUpdateItem = $conn->prepare("UPDATE order_items SET quantity = quantity + ? WHERE id = ?");
            $stmtUpdateItem->execute([$quantity, $existingItem['id']]);
        } else {
            // Neu hinzufügen
            $stmtInsertItem = $conn->prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
            $stmtInsertItem->execute([$orderId, $productId, $quantity, $price]);
        }

        // 4. Bestellsumme neu berechnen
        recalculateOrderTotal($conn, $orderId, floatval($order['discount']));

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Produkt erfolgreich zur Bestellung hinzugefügt."]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Fehler beim Hinzufügen des Artikels: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    // Artikel aus einer Bestellung entfernen (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    $orderId = isset($input['order_id']) ? intval($input['order_id']) : (isset($_GET['order_id']) ? intval($_GET['order_id']) : 0);
    $productId = isset($input['product_id']) ? intval($input['product_id']) : (isset($_GET['product_id']) ? intval($_GET['product_id']) : 0);

    if ($orderId <= 0 || $productId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "order_id und product_id sind erforderlich."]);
        exit;
    }

    try {
        $conn->beginTransaction();

        // 1. Überprüfen, ob Bestellung existiert
        $stmtOrderCheck = $conn->prepare("SELECT id, discount FROM orders WHERE id = ? FOR UPDATE");
        $stmtOrderCheck->execute([$orderId]);
        $order = $stmtOrderCheck->fetch(PDO::FETCH_ASSOC);

        if (!$order) {
            $conn->rollBack();
            http_response_code(404);
            echo json_encode(["error" => "Bestellung nicht gefunden."]);
            exit;
        }

        // 2. Artikel löschen
        $stmtDel = $conn->prepare("DELETE FROM order_items WHERE order_id = ? AND product_id = ?");
        $stmtDel->execute([$orderId, $productId]);

        // 3. Summe neu berechnen
        recalculateOrderTotal($conn, $orderId, floatval($order['discount']));

        $conn->commit();
        echo json_encode(["success" => true, "message" => "Produkt erfolgreich aus der Bestellung entfernt."]);

    } catch (Exception $e) {
        $conn->rollBack();
        http_response_code(500);
        echo json_encode(["error" => "Fehler beim Entfernen des Artikels: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}

// Hilfsfunktion: Berechnet die Bestellsumme unter Berücksichtigung des ursprünglichen Gutscheinrabatts neu (EPIC 9)
function recalculateOrderTotal($conn, $orderId, $discount) {
    // Summe aller verbliebenen Bestellpositionen holen
    $stmtSum = $conn->prepare("SELECT SUM(quantity * price) FROM order_items WHERE order_id = ?");
    $stmtSum->execute([$orderId]);
    $subtotal = floatval($stmtSum->fetchColumn());

    // Wenn keine Artikel mehr übrig sind, setzen wir subtotal auf 0
    if ($subtotal <= 0.0) {
        $subtotal = 0.0;
        $discount = 0.0; // Keine Produkte -> kein Rabatt
    }

    // Neue Gesamtsumme berechnen (darf nicht negativ sein)
    $newTotal = $subtotal - $discount;
    if ($newTotal < 0.0) {
        $newTotal = 0.0;
        $discount = $subtotal; // Rabatt begrenzen auf Zwischensumme
    }

    // Bestellung aktualisieren
    $stmtUpdate = $conn->prepare("UPDATE orders SET total_price = ?, discount = ? WHERE id = ?");
    $stmtUpdate->execute([$newTotal, $discount, $orderId]);
}
?>
