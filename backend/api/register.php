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

echo json_encode([

"message" => "Registrierung erfolgreich"

]);

?>