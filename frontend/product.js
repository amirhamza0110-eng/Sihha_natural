const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const API_PRODUCT_URL = `https://[https://sihha-natural.onrender.com/api](https://sihha-natural.onrender.com/api)/products/${productId}`;

let currentProductPrice = 0;
let currentProductName = "";


async function loadProductDetails() {
    if (!productId) {
        document.getElementById('loading-msg').innerText = "Product not found!";
        return;
    }

    try {
        const response = await fetch(API_PRODUCT_URL);
        if (!response.ok) throw new Error("Product fetch failed");
        
        const product = await response.json();

        // HTML এ ডাটা বসানো
        document.getElementById('pd-image').src = product.image_url;
        document.getElementById('pd-name').innerText = product.name;
        document.getElementById('pd-category').innerText = product.category;
        document.getElementById('pd-price').innerText = product.price;
        document.getElementById('pd-description').innerText = product.description;
        document.getElementById('pd-stock').innerText = product.stock;

        // Add to Cart বাটনে ক্লিক ইভেন্ট অ্যাড করা
        const addToCartBtn = document.getElementById('pd-add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.onclick = function() {
                addToCart(product.id, product.name, product.price, product.image_url);
            };
        }

        // লোডিং মেসেজ লুকিয়ে আসল কন্টেইনার দেখানো
        document.getElementById('loading-msg').classList.add('hidden');
        const container = document.getElementById('product-details-container');
        container.classList.remove('hidden');
        container.classList.add('flex');

    } catch (error) {
        console.error("Error:", error);
        const loadMsg = document.getElementById('loading-msg');
        if(loadMsg) {
            loadMsg.innerText = "Error loading product details. Please try again later.";
            loadMsg.classList.add("text-red-500");
        }
    }
}

loadProductDetails();

// ================= DIRECT ORDER (ORDER NOW) MODAL LOGIC =================
function openOrderModal() {
    currentProductPrice = parseInt(document.getElementById('pd-price').innerText);
    currentProductName = document.getElementById('pd-name').innerText;
    
    document.getElementById('bill-price').innerText = currentProductPrice;
    calculateTotal(); 
    
    document.getElementById('order-modal').classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

function calculateTotal() {
    const deliveryCharge = parseInt(document.getElementById('delivery-area').value);
    document.getElementById('bill-delivery').innerText = deliveryCharge;
    
    const total = currentProductPrice + deliveryCharge;
    document.getElementById('bill-total').innerText = total;
}

// ================= DIRECT ORDER FORM SUBMISSION =================
const orderForm = document.getElementById('order-form');
if (orderForm) {
    // লক্ষ্য করুন: ফাংশনের আগে async অ্যাড করা হয়েছে
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('customer-name').value;
        const phone = document.getElementById('customer-phone').value;
        const areaSelect = document.getElementById('delivery-area');
        const areaText = areaSelect.options[areaSelect.selectedIndex].text;
        const address = document.getElementById('customer-address').value;
        
        const price = parseInt(document.getElementById('bill-price').innerText);
        const delivery = parseInt(document.getElementById('bill-delivery').innerText);
        const total = parseInt(document.getElementById('bill-total').innerText);

        // ১. ব্যাকএন্ডের জন্য ডাটা সাজানো
        const orderData = {
            customer_name: name,
            customer_phone: phone,
            delivery_area: areaText,
            address: address,
            items: [{
                name: currentProductName,
                price: price,
                quantity: 1
            }],
            subtotal: price,
            delivery_charge: delivery,
            total: total
        };

        // ২. ডাটাবেসে অর্ডার সেভ করা (API কল)
        try {
            await fetch('https://[https://sihha-natural.onrender.com/api](https://sihha-natural.onrender.com/api)/orders/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        } catch (error) {
            console.error("Order save error:", error);
        }

        // ৩. হোয়াটসঅ্যাপে মেসেজ পাঠানো
        const message = `হ্যালো, আমি একটি অর্ডার করতে চাই! 🛍️
        
*প্রোডাক্ট:* ${currentProductName}
*দাম:* ৳${price}
*ডেলিভারি চার্জ:* ৳${delivery} (${areaText})
*মোট বিল:* ৳${total}

*ডেলিভারি ইনফরমেশন:*
নাম: ${name}
ফোন: ${phone}
ঠিকানা: ${address}`;

        const encodedMessage = encodeURIComponent(message);
        // cart.js এ থাকা WHATSAPP_NUMBER ভ্যারিয়েবলটাই এখানে কাজ করবে
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
        
        closeOrderModal();
        this.reset();
    });
}