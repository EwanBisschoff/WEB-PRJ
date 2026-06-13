<?php
// API für Produkt-Administration (EasyElectronics)
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
    // Alle Produkte für die Admin-Übersicht abrufen (EPIC 9)
    try {
        $stmt = $conn->prepare("SELECT id, name, description, price, image, category, rating FROM products ORDER BY id DESC");
        $stmt->execute();
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($products);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Laden der Produkte: " . $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Neues Produkt erstellen (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        $input = $_POST;
    }

    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $price = floatval($input['price'] ?? 0.0);
    $category = trim($input['category'] ?? '');
    $rating = isset($input['rating']) && $input['rating'] !== '' ? floatval($input['rating']) : null;
    $image = trim($input['image'] ?? '');

    if (empty($name) || $price <= 0.0 || empty($category)) {
        http_response_code(400);
        echo json_encode(["error" => "Name, Preis und Kategorie sind erforderliche Felder."]);
        exit;
    }

    try {
        $stmt = $conn->prepare("
            INSERT INTO products (name, description, price, image, category, rating)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$name, $description, $price, $image ?: null, $category, $rating]);
        
        echo json_encode([
            "success" => true,
            "message" => "Produkt erfolgreich erstellt.",
            "product_id" => $conn->lastInsertId()
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Erstellen des Produkts: " . $e->getMessage()]);
    }
} elseif ($method === 'PUT') {
    // Produkt bearbeiten/aktualisieren (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    
    $productId = isset($input['id']) ? intval($input['id']) : 0;
    $name = trim($input['name'] ?? '');
    $description = trim($input['description'] ?? '');
    $price = floatval($input['price'] ?? 0.0);
    $category = trim($input['category'] ?? '');
    $rating = isset($input['rating']) && $input['rating'] !== '' ? floatval($input['rating']) : null;
    $image = trim($input['image'] ?? '');

    if ($productId <= 0 || empty($name) || $price <= 0.0 || empty($category)) {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Produktdaten. ID, Name, Preis und Kategorie sind erforderlich."]);
        exit;
    }

    try {
        $stmt = $conn->prepare("
            UPDATE products
            SET name = ?, description = ?, price = ?, image = ?, category = ?, rating = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $description, $price, $image ?: null, $category, $rating, $productId]);
        
        echo json_encode([
            "success" => true,
            "message" => "Produkt erfolgreich aktualisiert."
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Aktualisieren des Produkts: " . $e->getMessage()]);
    }
} elseif ($method === 'DELETE') {
    // Produkt löschen (EPIC 9)
    $input = json_decode(file_get_contents("php://input"), true);
    $productId = isset($input['id']) ? intval($input['id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);

    if ($productId <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "Ungültige Produkt-ID."]);
        exit;
    }

    try {
        $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        
        echo json_encode([
            "success" => true,
            "message" => "Produkt erfolgreich gelöscht."
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "Datenbankfehler beim Löschen des Produkts: " . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Methode nicht erlaubt."]);
}
?>
