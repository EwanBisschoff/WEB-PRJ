document.getElementById('loginForm')

.addEventListener('submit', function(e){

e.preventDefault();

const data = {

login: document.getElementById('login').value,

password: document.getElementById('password').value,

remember: document.getElementById('remember').checked

};

fetch('../backend/api/login.php', {

method: 'POST',

headers: {
'Content-Type': 'application/json'
},

body: JSON.stringify(data)

})

.then(response => response.json())

.then(result => {

if(result.success){

document.getElementById('status').innerHTML =
'Willkommen ' + result.username + '! Sie werden weitergeleitet...';
document.getElementById('status').style.color = 'var(--success-color)';

// Umleitung nach 1.5 Sekunden (z.B. zurück zur Kasse oder Startseite)
const urlParams = new URLSearchParams(window.location.search);
const redirectTo = urlParams.get('redirect') || 'index.html';
setTimeout(() => {
    window.location.href = redirectTo;
}, 1500);

} else {

document.getElementById('status').innerHTML =
result.message;
document.getElementById('status').style.color = 'var(--danger-color)';
}

});
});