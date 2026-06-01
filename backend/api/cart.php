<?php
// Session-Verwaltung für den Warenkorb (EasyElectronics)
session_start();

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

$db = new DBAccess();
$conn = $db->connect();

// Warenkorb in Session initialisieren, falls nicht vorhanden
if (!isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    returnCartResponse($conn);
} elseif ($method === 'POST') {
    // JSON-Eingabedaten empfangen
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $action = $input['action'] ?? '';
    $productId = isset($input['product_id']) ? intval($input['product_id']) : 0;
    $quantity = isset($input['quantity']) ? intval($input['quantity']) : 1;

    // Aktionen ausführen
    if ($action === 'add') {
        if ($productId > 0) {
            // Prüfen, ob das Produkt in der DB existiert
            if (productExists($conn, $productId)) {
                if (isset($_SESSION['cart'][$productId])) {
                    $_SESSION['cart'][$productId] += 1;
                } else {
                    $_SESSION['cart'][$productId] = 1;
                }
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Produkt nicht gefunden."]);
                exit;
            }
        }
    } elseif ($action === 'update') {
        if ($productId > 0) {
            if ($quantity <= 0) {
                unset($_SESSION['cart'][$productId]);
            } else {
                if (productExists($conn, $productId)) {
                    $_SESSION['cart'][$productId] = $quantity;
                } else {
                    http_response_code(404);
                    echo json_encode(["error" => "Produkt nicht gefunden."]);
                    exit;
                }
            }
        }
    } elseif ($action === 'remove') {
        if ($productId > 0) {
            unset($_SESSION['cart'][$productId]);
        }
    } elseif ($action === 'clear') {
        $_SESSION['cart'] = [];
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Aktion."]);
        exit;
    }

    // Nach Änderungen aktuellen Warenkorb zurückliefern
    returnCartResponse($conn);
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}

// Hilfsfunktion: Prüft Existenz eines Produkts in der DB
function productExists($conn, $id) {
    $stmt = $conn->prepare("SELECT COUNT(*) FROM products WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetchColumn() > 0;
}

// Hilfsfunktion: Berechnet und liefert Warenkorb-Details als JSON
function returnCartResponse($conn) {
    $cartItems = [];
    $subtotal = 0.0;
    $totalItems = 0;

    $productIds = array_keys($_SESSION['cart']);

    if (count($productIds) > 0) {
        // Platzhalter für IN-Klausel generieren
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $sql = "SELECT * FROM products WHERE id IN ($placeholders)";
        $stmt = $conn->prepare($sql);
        $stmt->execute($productIds);
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($products as $product) {
            $id = intval($product['id']);
            $qty = intval($_SESSION['cart'][$id]);
            $price = floatval($product['price']);
            $lineTotal = $price * $qty;

            $subtotal += $lineTotal;
            $totalItems += $qty;

            $cartItems[] = [
                "id" => $id,
                "name" => $product['name'],
                "description" => $product['description'],
                "price" => $price,
                "image" => $product['image'],
                "category" => $product['category'],
                "quantity" => $qty,
                "line_total" => round($lineTotal, 2)
            ];
        }
    }

    // Versandkosten-Logik: Standardmäßig 0.00 Euro unabhängig vom Bestellwert
    $shipping = 0.00;
    $grandTotal = $subtotal + $shipping;

    echo json_encode([
        "items" => $cartItems,
        "subtotal" => round($subtotal, 2),
        "shipping" => round($shipping, 2),
        "grand_total" => round($grandTotal, 2),
        "total_items" => $totalItems
    ]);
}
?>
