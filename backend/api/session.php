<?php
// API zur Abfrage des aktuellen Anmeldestatus (EasyElectronics)
session_start();
header('Content-Type: application/json');
require_once '../config/dbaccess.php';

// Falls keine Session existiert, aber ein "remember_token" Cookie vorhanden ist -> Auto-Login (EPIC 9 / Cookie)
if (!isset($_SESSION['user']) && isset($_COOKIE['remember_token'])) {
    $token = $_COOKIE['remember_token'];
    
    $db = new DBAccess();
    $conn = $db->connect();
    
    try {
        $stmt = $conn->prepare("SELECT * FROM users WHERE remember_token = ? AND is_blocked = 0");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user) {
            // User in Session einloggen
            $_SESSION['user'] = $user;
            $userId = intval($user['id']);
            
            // Warenkorb aus der DB laden
            $_SESSION['cart'] = [];
            $stmtCart = $conn->prepare("SELECT product_id, quantity FROM cart_items WHERE user_id = ?");
            $stmtCart->execute([$userId]);
            $dbCartItems = $stmtCart->fetchAll(PDO::FETCH_ASSOC);
            foreach ($dbCartItems as $item) {
                $_SESSION['cart'][intval($item['product_id'])] = intval($item['quantity']);
            }
        }
    } catch (PDOException $e) {
        // Fehler stillschweigend ignorieren
    }
}

if (isset($_SESSION['user'])) {
    echo json_encode([
        "loggedIn" => true,
        "id" => $_SESSION['user']['id'],
        "username" => $_SESSION['user']['username'],
        "role" => $_SESSION['user']['role']
    ]);
} else {
    echo json_encode([
        "loggedIn" => false
    ]);
}
?>