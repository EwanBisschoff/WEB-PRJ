function loadProducts(category = 'Elektronik'){

fetch(`/EasyElectronics/backend/api/products.php?category=${category}`)

.then(response => response.json())

.then(data => {

let output = '';

data.forEach(product => {

output += `

<div class="product">

<h2>${product.name}</h2>

<p>${product.description}</p>

<p>${product.price} €</p>

</div>

`;
});

document.getElementById('products').innerHTML = output;

});
}

loadProducts();

document.getElementById('categorySelect')

.addEventListener('change', function(){

loadProducts(this.value);

});