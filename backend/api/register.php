<?php

header('Content-Type: application/json');

require_once '../config/dbaccess.php';

$data = json_decode(file_get_contents("php://input"));

$db = new DBAccess();

$conn = $db->connect();

$password = password_hash(
$data->password,
PASSWORD_DEFAULT
);

$sql = "INSERT INTO users
(firstname, lastname, email, username, password)
VALUES (?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

$stmt->execute([

$data->firstname,
$data->lastname,
$data->email,
$data->username,
$password

]);

$userId = intval($conn->lastInsertId());

// Standard-Zahlungsarten für den neuen Benutzer anlegen (EPIC 7)
$stmtAddPay1 = $conn->prepare("INSERT INTO payment_methods (user_id, provider, details) VALUES (?, 'Visa', '•••• 4321')");
$stmtAddPay1->execute([$userId]);

$stmtAddPay2 = $conn->prepare("INSERT INTO payment_methods (user_id, provider, details) VALUES (?, 'PayPal', ?)");
$stmtAddPay2->execute([$userId, $data->email]);

echo json_encode([

"message" => "Registrierung erfolgreich"

]);

?>