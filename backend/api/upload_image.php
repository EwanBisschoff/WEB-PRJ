<?php
// API zum Upload von Produktbildern (EasyElectronics)
session_start();

header('Content-Type: application/json');

// Überprüfen, ob der Benutzer angemeldet und ein Administrator ist (EPIC 9)
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(["error" => "Zugriff verweigert. Nur für Administratoren."]);
    exit;
}

// Prüfen, ob eine Datei hochgeladen wurde
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["error" => "Es wurde keine Datei hochgeladen oder es gab einen Upload-Fehler."]);
    exit;
}

$file = $_FILES['image'];
$fileName = $file['name'];
$fileTmpPath = $file['tmp_name'];
$fileSize = $file['size'];

// Dateiendung überprüfen
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if (!in_array($fileExtension, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(["error" => "Ungültiges Dateiformat. Erlaubt sind: " . implode(', ', $allowedExtensions)]);
    exit;
}

// Dateigröße überprüfen (z. B. max 5MB)
$maxFileSize = 5 * 1024 * 1024;
if ($fileSize > $maxFileSize) {
    http_response_code(400);
    echo json_encode(["error" => "Die Datei ist zu groß. Maximale Dateigröße beträgt 5MB."]);
    exit;
}

// Zielverzeichnis erstellen (dynamisch relativ zum Projektpfad)
$targetDir = '../../frontend/images/';
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// Eindeutigen Dateinamen generieren (EPIC 9)
$newFileName = uniqid('prod_', true) . '.' . $fileExtension;
$targetFilePath = $targetDir . $newFileName;

// Datei verschieben
if (move_uploaded_file($fileTmpPath, $targetFilePath)) {
    // Relative Pfadangabe für die Speicherung in der Datenbank zurückliefern
    echo json_encode([
        "success" => true,
        "message" => "Bild erfolgreich hochgeladen.",
        "image_path" => "images/" . $newFileName
    ]);
} else {
    http_response_code(500);
    echo json_encode(["error" => "Fehler beim Speichern der Datei auf dem Server."]);
}
?>
