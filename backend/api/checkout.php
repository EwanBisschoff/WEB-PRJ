<?php
// API zum Abschluss der Bestellung (EasyElectronics)
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

$paymentMethodId = isset($input['payment_method_id']) ? intval($input['payment_method_id']) : 0;
$voucherCode = trim($input['voucher_code'] ?? '');

if ($paymentMethodId <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Bitte wählen Sie eine gültige Zahlungsart aus."]);
    exit;
}

// Warenkorb überprüfen
if (!isset($_SESSION['cart']) || empty($_SESSION['cart'])) {
    http_response_code(400);
    echo json_encode(["error" => "Ihr Warenkorb ist leer."]);
    exit;
}

$db = new DBAccess();
$conn = $db->connect();

try {
    // Transaktion starten
    $conn->beginTransaction();

    // 1. Gültigkeit der Zahlungsart überprüfen (muss dem aktuellen Benutzer gehören)
    $stmtPay = $conn->prepare("SELECT id FROM payment_methods WHERE id = ? AND user_id = ?");
    $stmtPay->execute([$paymentMethodId, $userId]);
    if (!$stmtPay->fetch()) {
        $conn->rollBack();
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Zahlungsart ausgewählt."]);
        exit;
    }

    // 2. Produkte aus der Datenbank abrufen und Gesamtsumme berechnen
    $productIds = array_keys($_SESSION['cart']);
    $placeholders = implode(',', array_fill(0, count($productIds), '?'));
    
    $stmtProd = $conn->prepare("SELECT id, price FROM products WHERE id IN ($placeholders)");
    $stmtProd->execute($productIds);
    $products = $stmtProd->fetchAll(PDO::FETCH_ASSOC);

    $productsMap = [];
    foreach ($products as $prod) {
        $productsMap[intval($prod['id'])] = floatval($prod['price']);
    }

    $subtotal = 0.0;
    $orderItemsData = [];

    foreach ($_SESSION['cart'] as $prodId => $qty) {
        if (!isset($productsMap[$prodId])) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(["error" => "Ein Produkt in Ihrem Warenkorb existiert nicht mehr."]);
            exit;
        }
        $price = $productsMap[$prodId];
        $lineTotal = $price * $qty;
        $subtotal += $lineTotal;

        $orderItemsData[] = [
            "product_id" => $prodId,
            "quantity" => $qty,
            "price" => $price
        ];
    }

    // 3. Gutschein anwenden, falls angegeben
    $voucherId = null;
    $discount = 0.0;
    $finalTotal = $subtotal;

    if (!empty($voucherCode)) {
        $stmtVoucher = $conn->prepare("SELECT id, code, value, original_value, is_redeemed FROM vouchers WHERE code = ? FOR UPDATE");
        $stmtVoucher->execute([$voucherCode]);
        $voucher = $stmtVoucher->fetch(PDO::FETCH_ASSOC);

        if (!$voucher) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(["error" => "Der eingegebene Gutscheincode ist ungültig."]);
            exit;
        }

        if (intval($voucher['is_redeemed']) === 1 || floatval($voucher['value']) <= 0) {
            $conn->rollBack();
            http_response_code(400);
            echo json_encode(["error" => "Dieser Gutschein wurde bereits vollständig eingelöst."]);
            exit;
        }

        $voucherId = intval($voucher['id']);
        $voucherValue = floatval($voucher['value']);

        if ($voucherValue >= $subtotal) {
            $discount = $subtotal;
            $finalTotal = 0.0;
            $newVoucherValue = $voucherValue - $subtotal;
        } else {
            $discount = $voucherValue;
            $finalTotal = $subtotal - $voucherValue;
            $newVoucherValue = 0.0;
        }

        // Gutscheinwert aktualisieren und ggf. als eingelöst markieren (EPIC 7)
        $isRedeemed = ($newVoucherValue <= 0.0) ? 1 : 0;
        $stmtUpdateVoucher = $conn->prepare("UPDATE vouchers SET value = ?, is_redeemed = ? WHERE id = ?");
        $stmtUpdateVoucher->execute([$newVoucherValue, $isRedeemed, $voucherId]);
    }

    // 4. Bestellung in Tabelle `orders` einfügen (EPIC 7)
    $stmtOrder = $conn->prepare("
        INSERT INTO orders (user_id, total_price, discount, voucher_id, payment_method_id)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmtOrder->execute([$userId, $finalTotal, $discount, $voucherId, $paymentMethodId]);
    $orderId = intval($conn->lastInsertId());

    // 5. Bestelldetails in Tabelle `order_items` einfügen (EPIC 7)
    $stmtItem = $conn->prepare("
        INSERT INTO order_items (order_id, product_id, quantity, price)
        VALUES (?, ?, ?, ?)
    ");
    foreach ($orderItemsData as $item) {
        $stmtItem->execute([$orderId, $item['product_id'], $item['quantity'], $item['price']]);
    }

    // 6. Warenkorb des Benutzers in Datenbank löschen (EPIC 7)
    $stmtClearCart = $conn->prepare("DELETE FROM cart_items WHERE user_id = ?");
    $stmtClearCart->execute([$userId]);

    // 7. Warenkorb in der Session leeren
    $_SESSION['cart'] = [];

    // Transaktion committen
    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Bestellung erfolgreich abgeschlossen.",
        "order_id" => $orderId,
        "final_total" => round($finalTotal, 2)
    ]);

} catch (Exception $e) {
    $conn->rollBack();
    http_response_code(500);
    echo json_encode(["error" => "Fehler bei der Bestellung: " . $e->getMessage()]);
}
?>
