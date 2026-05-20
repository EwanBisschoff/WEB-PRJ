<?php

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

$db = new DBAccess();

$conn = $db->connect();

$category = $_GET['category'] ?? null;

if($category){

$sql = "SELECT * FROM products WHERE category = ?";

$stmt = $conn->prepare($sql);

$stmt->execute([$category]);

} else {

$sql = "SELECT * FROM products";

$stmt = $conn->prepare($sql);

$stmt->execute();
}

$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($products);

?>