<?php

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

$db = new DBAccess();
$conn = $db->connect();

// Parameter aus dem AJAX-GET-Request lesen
$category = $_GET['category'] ?? null;
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

// SQL aufbauen
if ($category) {
    $sql = "SELECT * FROM products WHERE category = :category";
} else {
    $sql = "SELECT * FROM products WHERE 1=1";
}

// Wenn ein Suchbegriff eingegeben, SQL-Abfrage dynamisch machen
if ($search !== '') {
    $sql .= " AND (name LIKE :search OR description LIKE :search)";
}

$stmt = $conn->prepare($sql);

// Parameter sicher per Prepared Statement machen (Schutz vor SQL Injection)
if ($category) {
    $stmt->bindValue(':category', $category);
}

if ($search !== '') {
    // Wildcards % für die Teiltextsuche hinzufügen
    $stmt->bindValue(':search', '%' . $search . '%');
}

$stmt->execute();
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($products);

?>