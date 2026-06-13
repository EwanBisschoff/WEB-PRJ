<?php
// Admin-Bereich Einstiegspunkt (EasyElectronics)
session_start();

// Überprüfen, ob der Benutzer ein Administrator ist (EPIC 9)
// Wenn nicht, wird eine echte 404-Meldung zurückgegeben, um die Existenz der Seite komplett zu verbergen
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    header("HTTP/1.0 404 Not Found");
    ?>
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
<hr>
<address>Apache/2.4.58 (Win64) OpenSSL/3.1.3 PHP/8.2.12 Server at localhost Port 80</address>
</body></html>
    <?php
    exit;
}

// Wenn der Benutzer ein Administrator ist, wird die statische HTML-Datei aus dem Frontend geladen
// Durch die Verwendung von readfile bleibt das Frontend frei von PHP-Code (EPIC 9)
readfile('../frontend/admin.html');
exit;
?>
