<?php

session_start();

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

$data = json_decode(file_get_contents("php://input"));

$db = new DBAccess();

$conn = $db->connect();

$sql = "SELECT * FROM users
WHERE username = ? OR email = ?";

$stmt = $conn->prepare($sql);

$stmt->execute([
$data->login,
$data->login
]);

$user = $stmt->fetch(PDO::FETCH_ASSOC);

if($user && password_verify($data->password, $user['password'])){

if (intval($user['is_blocked']) === 1) {
    echo json_encode([
        "success" => false,
        "message" => "Dieses Konto wurde gesperrt. Bitte kontaktieren Sie den Administrator."
    ]);
    exit;
}

$_SESSION['user'] = $user;
$userId = intval($user['id']);

// 1. Warenkorb aus der Session mit dem Datenbank-Warenkorb zusammenführen (EPIC 7)
if (isset($_SESSION['cart']) && !empty($_SESSION['cart'])) {
    foreach ($_SESSION['cart'] as $productId => $quantity) {
        $stmtMerge = $conn->prepare("
            INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
        ");
        $stmtMerge->execute([$userId, $productId, $quantity, $quantity]);
    }
}

// 2. Den kompletten Warenkorb aus der Datenbank in die Session laden
$_SESSION['cart'] = [];
$stmtCart = $conn->prepare("SELECT product_id, quantity FROM cart_items WHERE user_id = ?");
$stmtCart->execute([$userId]);
$dbCartItems = $stmtCart->fetchAll(PDO::FETCH_ASSOC);
foreach ($dbCartItems as $item) {
    $_SESSION['cart'][intval($item['product_id'])] = intval($item['quantity']);
}

// 3. Standard-Zahlungsarten für den Benutzer anlegen, falls keine existieren (EPIC 7)
$stmtPayCount = $conn->prepare("SELECT COUNT(*) FROM payment_methods WHERE user_id = ?");
$stmtPayCount->execute([$userId]);
if ($stmtPayCount->fetchColumn() == 0) {
    // Standard-Kreditkarte anlegen
    $stmtAddPay1 = $conn->prepare("INSERT INTO payment_methods (user_id, provider, details) VALUES (?, 'Visa', '•••• 4321')");
    $stmtAddPay1->execute([$userId]);
    
    // Standard-PayPal anlegen
    $stmtAddPay2 = $conn->prepare("INSERT INTO payment_methods (user_id, provider, details) VALUES (?, 'PayPal', ?)");
    $stmtAddPay2->execute([$userId, $user['email']]);
    }
    // 4. "Login merken" Cookie-Handling (EPIC 9 / Alignment)
    if (isset($data->remember) && $data->remember === true) {
        $token = bin2hex(random_bytes(32));
        $stmtToken = $conn->prepare("UPDATE users SET remember_token = ? WHERE id = ?");
        $stmtToken->execute([$token, $userId]);
        
        // Cookie für 30 Tage setzen (HTTPOnly)
        setcookie('remember_token', $token, time() + 30 * 24 * 60 * 60, '/', '', false, true);
    }

    echo json_encode([
        "success" => true,
        "username" => $user['username']
    ]);
} else {

echo json_encode([

"success" => false,
"message" => "Login fehlgeschlagen"

]);
}

?>