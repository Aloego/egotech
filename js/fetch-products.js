document.addEventListener("DOMContentLoaded", function () {
  // your fetch code here

const sheetURL = "https://script.google.com/macros/s/AKfycbzuFZGadwHy-2ZaHUh9X_jHCAetM6TMJbWAgHnZ9F5kckqbNrXi7rsY2X8LVaSitJs/exec"; // Paste your web app URL here

fetch(sheetURL)
  .then(res => res.json())
  .then(products => {
    const container = document.getElementById("product-list");
    products.forEach(product => {
      container.innerHTML += `
        <div class="col-md-4 mb-4">
          <div class="card h-100">
            <img src="${product['Image URL']}" class="card-img-top" alt="${product.Name}">
            <div class="card-body">
              <h5 class="card-title">${product.Name}</h5>
              <p class="card-text">${product.Description}</p>
              <p class="card-text text-primary"><strong>$${product.Price}</strong></p>
              <a href="#" class="btn btn-outline-primary">Add to Cart</a>
            </div>
          </div>
        </div>
      `;
    });
  })
  .catch(error => console.error("Error fetching products:", error));

});