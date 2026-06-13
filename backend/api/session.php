<?php

session_start();

header('Content-Type: application/json');

if(isset($_SESSION['user'])){

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