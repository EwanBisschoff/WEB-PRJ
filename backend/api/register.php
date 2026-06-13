<?php
// API zur Benutzerregistrierung (EasyElectronics)
header('Content-Type: application/json');
require_once '../config/dbaccess.php';

// JSON Payload einlesen
$data = json_decode(file_get_contents("php://input"));

if (!$data) {
    http_response_code(400);
    echo json_encode(["error" => "Ungültige Anforderungsdaten."]);
    exit;
}

// Felder extrahieren und trimmen
$salutation = trim($data->salutation ?? '');
$firstname = trim($data->firstname ?? '');
$lastname = trim($data->lastname ?? '');
$email = trim($data->email ?? '');
$username = trim($data->username ?? '');
$password = $data->password ?? '';
$address = trim($data->address ?? '');
$zip = trim($data->zip ?? '');
$city = trim($data->city ?? '');
$paymentProvider = trim($data->payment_provider ?? '');
$paymentDetails = trim($data->payment_details ?? '');

// Server-seitige Validierung auf Vollständigkeit und Richtigkeit (Bewertungsmatrix)
if (
    empty($salutation) || empty($firstname) || empty($lastname) || empty($email) || 
    empty($username) || empty($password) || empty($address) || empty($zip) || 
    empty($city) || empty($paymentProvider) || empty($paymentDetails)
) {
    http_response_code(400);
    echo json_encode(["error" => "Alle Registrierungs- und Zahlungsinformationen müssen ausgefüllt werden."]);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Bitte geben Sie eine gültige E-Mail-Adresse an."]);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(["error" => "Das Passwort muss mindestens 6 Zeichen lang sein."]);
    exit;
}

$db = new DBAccess();
$conn = $db->connect();

try {
    // Überprüfen, ob Username oder E-Mail bereits existieren
    $stmtCheck = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmtCheck->execute([$username, $email]);
    if ($stmtCheck->fetch()) {
        http_response_code(400);
        echo json_encode(["error" => "Benutzername oder E-Mail-Adresse wird bereits verwendet."]);
        exit;
    }

    // Passwort verschlüsseln (Verschlüsselt in DB ablegen)
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    // User in DB anlegen
    $sqlInsert = "
        INSERT INTO users (firstname, lastname, email, username, password, salutation, address, zip, city)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ";
    $stmtInsert = $conn->prepare($sqlInsert);
    $stmtInsert->execute([
        $firstname,
        $lastname,
        $email,
        $username,
        $passwordHash,
        $salutation,
        $address,
        $zip,
        $city
    ]);

    $userId = intval($conn->lastInsertId());

    // Zahlungsinformationen in der DB speichern (Zahlungsinformationen bei der Registrierung)
    $sqlPayment = "INSERT INTO payment_methods (user_id, provider, details) VALUES (?, ?, ?)";
    $stmtPayment = $conn->prepare($sqlPayment);
    $stmtPayment->execute([$userId, $paymentProvider, $paymentDetails]);

    echo json_encode([
        "success" => true,
        "message" => "Registrierung erfolgreich"
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Datenbankfehler bei der Registrierung: " . $e->getMessage()]);
}
?>