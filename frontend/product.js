const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');
const API_PRODUCT_URL = `https://sihha-natural.onrender.com/api/products/${productId}`;

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

// ================= PAYMENT TOGGLE & COPY LOGIC (DIRECT) =================
function togglePayment(type) {
    const method = document.querySelector(`input[name="payment_${type}"]:checked`).value;
    const bkashSection = document.getElementById(`bkash-section-${type}`);
    
    if (method === 'bKash') {
        bkashSection.classList.remove('hidden');
    } else {
        bkashSection.classList.add('hidden');
    }
}

// ================= FREE DELIVERY & CALCULATION (DIRECT ORDER) =================
function calculateTotal() {
    let price = parseFloat(document.getElementById('bill-price').innerText) || 0;
    let deliveryCharge = parseInt(document.getElementById('delivery-area').value);
    
    const alertBox = document.getElementById('free-delivery-alert-direct');

    if (price >= 500) {
        // ৫০০ বা তার বেশি হলে ফ্রি ডেলিভারি
        deliveryCharge = 0;
        if (alertBox) {
            alertBox.className = "text-sm font-bold p-2.5 rounded-lg border flex items-center gap-2 bg-green-100 text-green-800 border-green-300 animate-pulse mt-2";
            alertBox.innerHTML = '<i class="fa-solid fa-gift text-red-500 text-lg"></i> অভিনন্দন! আপনি ফ্রি ডেলিভারি পেয়েছেন!';
        }
    } else if (price > 0) {
        // ৫০০ এর কম হলে আপসেল মেসেজ
        let neededAmount = 500 - price;
        if (alertBox) {
            alertBox.className = "text-sm font-bold p-2.5 rounded-lg border flex items-center gap-2 bg-orange-100 text-orange-800 border-orange-300 mt-2";
            alertBox.innerHTML = `<i class="fa-solid fa-cart-plus text-orange-600 text-lg"></i> আর মাত্র ৳${neededAmount} টাকার প্রোডাক্ট নিলেই ডেলিভারি ফ্রি!`;
        }
    } else {
        if (alertBox) alertBox.className = "hidden";
    }

    // বিল আপডেট করা
    document.getElementById('bill-delivery').innerText = deliveryCharge;
    document.getElementById('bill-total').innerText = price + deliveryCharge;
}

// ================= DIRECT ORDER FORM SUBMISSION =================
const orderForm = document.getElementById('order-form');
if (orderForm) {
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

        // ১. পেমেন্ট মেথড এবং TrxID ক্যাপচার করা
        const paymentMethod = document.querySelector('input[name="payment_direct"]:checked').value;
        const trxId = document.getElementById('trx-id-direct').value;

        // ২. যদি বিকাশ সিলেক্ট করে কিন্তু TrxID বা লাস্ট ডিজিট না দেয়
        if (paymentMethod === 'bKash' && trxId.trim() === "") {
            alert("অনুগ্রহ করে Transaction ID (TrxID) অথবা নাম্বারের শেষের ৩ ডিজিট দিন!");
            return;
        }

        // ৩. ব্যাকএন্ডের জন্য ডাটা সাজানো (পেমেন্ট ইনফো সহ)
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
            total: total,
            payment_method: paymentMethod,
            trx_id: trxId
        };

        // সাবমিট বাটন লোডিং করা
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = "Processing... <i class='fa-solid fa-spinner fa-spin ml-2'></i>";
        submitBtn.disabled = true;

        // ৪. ডাটাবেসে অর্ডার সেভ করা (API কল)
        try {
            await fetch('https://sihha-natural.onrender.com/api/orders/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
        } catch (error) {
            console.error("Order save error:", error);
        }

        // ৫. হোয়াটসঅ্যাপে মেসেজ প্রস্তুত করা (পেমেন্ট ও TrxID সহ)
        let paymentDetailsTxt = `*পেমেন্ট মাধ্যম:* ${paymentMethod}\n`;
        if (paymentMethod === 'bKash') {
            paymentDetailsTxt += `*TrxID/Last 3 Digits:* ${trxId}\n📌 *Note: Please check the TrxID and confirm.*\n`;
        }

        const message = `হ্যালো, আমি একটি ডাইরেক্ট অর্ডার করতে চাই! 🛍️
        
*প্রোডাক্ট:* ${currentProductName}
*দাম:* ৳${price}
*ডেলিভারি চার্জ:* ৳${delivery} ${delivery === 0 ? "(Free Delivery 🎉)" : "(" + areaText + ")"}
*মোট বিল:* ৳${total}

${paymentDetailsTxt}
*ডেলিভারি ইনফরমেশন:*
নাম: ${name}
ফোন: ${phone}
ঠিকানা: ${address}`;

        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, '_blank');
        
        closeOrderModal();
        this.reset();

        // পেমেন্ট সেকশন হাইড করা এবং বাটন আগের অবস্থায় ফেরানো
        document.getElementById('bkash-section-direct')?.classList.add('hidden');
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    });
}