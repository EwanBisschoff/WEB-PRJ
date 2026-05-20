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

$_SESSION['user'] = $user;

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