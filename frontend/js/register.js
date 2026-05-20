document.getElementById('registerForm')

.addEventListener('submit', function(e){

e.preventDefault();

const password =
document.getElementById('password').value;

const password2 =
document.getElementById('password2').value;

if(password !== password2){

alert('Passwörter stimmen nicht überein');

return;
}

const data = {

firstname:
document.getElementById('firstname').value,

lastname:
document.getElementById('lastname').value,

email:
document.getElementById('email').value,

username:
document.getElementById('username').value,

password: password
};

fetch('/EasyElectronics/backend/api/register.php', {

method: 'POST',

headers: {
'Content-Type': 'application/json'
},

body: JSON.stringify(data)

})

.then(response => response.json())

.then(result => {

alert(result.message);

});
});