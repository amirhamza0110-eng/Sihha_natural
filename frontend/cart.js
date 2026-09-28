// LocalStorage থেকে কার্টের ডাটা আনা, না থাকলে খালি Array
let cart = JSON.parse(localStorage.getItem('sihha_cart')) || [];

function saveCart() {
    localStorage.setItem('sihha_cart', JSON.stringify(cart));
    updateCartUI();
}

function toggleCart(forceOpen = false) {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    
    if (forceOpen === true || drawer.classList.contains('translate-x-full')) {
        drawer.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        drawer.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }
}

// প্রোডাক্ট কার্টে অ্যাড করার ফাংশন
function addToCart(id, name, price, image) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1; // আগে থেকেই থাকলে শুধু পরিমাণ বাড়বে
    } else {
        cart.push({ id, name, price, image, quantity: 1 }); // নতুন হলে লিস্টে ঢুকবে
    }
    saveCart();
    toggleCart(true); // কার্ট অ্যাড হওয়ার পর অটোমেটিক ড্রয়ার ওপেন হবে
}

// পরিমাণ কমানো বা বাড়ানো
function changeQuantity(id, delta) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id); // পরিমাণ ০ হলে কার্ট থেকে ডিলিট
        }
        saveCart();
    }
}

// কার্টের UI (ডিজাইন) আপডেট করার ফাংশন
function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    
    if(!cartItemsContainer) return; // পেজে কার্ট না থাকলে এরর খাবে না

    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="text-center text-gray-500 mt-10">Your cart is empty.</p>`;
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            cartItemsContainer.innerHTML += `
                <div class="flex items-center gap-4 bg-white p-3 rounded-lg shadow-sm border">
                    <img src="${item.image}" class="w-16 h-16 object-cover rounded">
                    <div class="flex-1">
                        <h4 class="text-sm font-bold text-chocoDark line-clamp-1">${item.name}</h4>
                        <div class="text-natureGreen font-semibold text-sm">৳${item.price}</div>
                        <div class="flex items-center gap-3 mt-2">
                            <button onclick="changeQuantity('${item.id}', -1)" class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center font-bold hover:bg-gray-300">-</button>
                            <span class="text-sm font-bold">${item.quantity}</span>
                            <button onclick="changeQuantity('${item.id}', 1)" class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center font-bold hover:bg-gray-300">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    cartSubtotal.innerText = total;

    updateCartCountUI(); // কার্টের কাউন্টার আপডেট করা
}

// পেজ লোড হওয়ার সাথে সাথে কার্ট আপডেট হবে
document.addEventListener("DOMContentLoaded", updateCartUI);

const WHATSAPP_NUMBER = "8801785210338"; // আপনার নাম্বার দিন

// উপরের কার্ট আইকনের কাউন্টার আপডেট করা
function updateCartCountUI() {
    const cartCountEl = document.getElementById('cart-count');
    if(cartCountEl) {
        cartCountEl.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
    }
}
// updateCartUI ফাংশনের একদম শেষে updateCartCountUI() কল করে দিন। 
// (কোডের ভেতরে যেখানে updateCartUI শেষ হয়েছে সেখানে এই লাইনটা অ্যাড করুন: updateCartCountUI(); )


// ================= CART CHECKOUT MODAL LOGIC =================
let cartSubtotalValue = 0;

function openCartModal() {
    if(cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }
    
    // কার্ট ড্রয়ার বন্ধ করে পপ-আপ খোলা
    toggleCart(false);
    
    // মোট দাম হিসাব করা
    cartSubtotalValue = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    document.getElementById('cart-bill-price').innerText = cartSubtotalValue;
    
    calculateCartTotal();
    document.getElementById('cart-order-modal').classList.remove('hidden');
}

function closeCartModal() {
    document.getElementById('cart-order-modal').classList.add('hidden');
}

function calculateCartTotal() {
    const deliveryCharge = parseInt(document.getElementById('cart-delivery-area').value);
    document.getElementById('cart-bill-delivery').innerText = deliveryCharge;
    
    const total = cartSubtotalValue + deliveryCharge;
    document.getElementById('cart-bill-total').innerText = total;
}

// ================= CART WHATSAPP SUBMIT =================
document.getElementById('cart-order-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('cart-customer-name').value;
    const phone = document.getElementById('cart-customer-phone').value;
    const areaSelect = document.getElementById('cart-delivery-area');
    const areaText = areaSelect.options[areaSelect.selectedIndex].text;
    const address = document.getElementById('cart-customer-address').value;
    
    const delivery = parseInt(document.getElementById('cart-bill-delivery').innerText);
    const total = parseInt(document.getElementById('cart-bill-total').innerText);

    // ১. ব্যাকএন্ডের জন্য কার্টের আইটেমগুলো সাজানো
    const orderItems = cart.map(item => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity
    }));

    const orderData = {
        customer_name: name,
        customer_phone: phone,
        delivery_area: areaText,
        address: address,
        items: orderItems,
        subtotal: cartSubtotalValue,
        delivery_charge: delivery,
        total: total
    };

    // ২. ডাটাবেসে অর্ডার সেভ করা (API কল)
    try {
        await fetch('https://https://sihha-natural.onrender.com/api/orders/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
    } catch (error) {
        console.error("Order save error:", error);
    }

    // ৩. হোয়াটসঅ্যাপে মেসেজ পাঠানো
    let productListTxt = "";
    cart.forEach((item, index) => {
        productListTxt += `${index + 1}. ${item.name} (${item.quantity} pcs) - ৳${item.price * item.quantity}\n`;
    });

    const message = `হ্যালো, আমি ওয়েবসাইট থেকে একটি অর্ডার করতে চাই! 🛍️

*অর্ডারের বিবরণ:*
${productListTxt}
*সাবটোটাল:* ৳${cartSubtotalValue}
*ডেলিভারি চার্জ:* ৳${delivery} (${areaText})
*মোট বিল:* ৳${total}

*ডেলিভারি ইনফরমেশন:*
নাম: ${name}
ফোন: ${phone}
ঠিকানা: ${address}`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
    
    // অর্ডার কমপ্লিট হওয়ার পর কার্ট ক্লিয়ার করা
    cart = [];
    saveCart();
    
    closeCartModal();
    this.reset();
});