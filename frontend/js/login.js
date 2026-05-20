document.getElementById('loginForm')

.addEventListener('submit', function(e){

e.preventDefault();

const data = {

login: document.getElementById('login').value,

password: document.getElementById('password').value,

remember: document.getElementById('remember').checked

};

fetch('/EasyElectronics/backend/api/login.php', {

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
'Willkommen ' + result.username;

} else {

document.getElementById('status').innerHTML =
result.message;
}

});
});