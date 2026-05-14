const products = [
    {
        id: 1,
        title: 'Wireless Headphones',
        price: 59.99,
        image: 'https://via.placeholder.com/120x120?text=Headphones'
    },
    {
        id: 2,
        title: 'Bluetooth Speaker',
        price: 39.99,
        image: 'https://via.placeholder.com/120x120?text=Speaker'
    },
    {
        id: 3,
        title: 'Fitness Watch',
        price: 99.99,
        image: 'https://via.placeholder.com/120x120?text=Watch'
    },
    {
        id: 4,
        title: 'USB Charger',
        price: 9.99,
        image: 'https://via.placeholder.com/120x120?text=Charger'
    }
];

const cart = {};

function renderProducts() {
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    products.forEach(product => {
        const div = document.createElement('div');
        div.className = 'product';
        div.innerHTML = `
            <img src="${product.image}" alt="${product.title}">
            <div class="product-title">${product.title}</div>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <button onclick="addToCart(${product.id})">Add to Cart</button>
        `;
        productList.appendChild(div);
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!cart[productId]) {
        cart[productId] = { ...product, quantity: 1 };
    } else {
        cart[productId].quantity += 1;
    }
    renderCart();
}

function renderCart() {
    const cartList = document.getElementById('cart-list');
    cartList.innerHTML = '';
    let total = 0;
    for (const key in cart) {
        const item = cart[key];
        total += item.price * item.quantity;
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${item.title} (x${item.quantity})</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        cartList.appendChild(li);
    }
    document.getElementById('cart-total').textContent =
        'Total: $' + total.toFixed(2);
}

document.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    renderCart();
});
