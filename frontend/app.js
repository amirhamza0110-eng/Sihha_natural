// ================= গ্লোবাল ভেরিয়েবল (সার্চ ও ফিল্টারের জন্য) =================
let allProducts = [];

const API_URL = "https://sihha-natural.onrender.com/api/products/";
const BANNERS_API = "https://sihha-natural.onrender.com/api/banners/";
const CATEGORIES_API = "https://sihha-natural.onrender.com/api/categories/";
const VIDEOS_API = "https://sihha-natural.onrender.com/api/videos/"; 
const OFFERS_API = "https://sihha-natural.onrender.com/api/offers";

const productContainer = document.getElementById("product-container");
const loadingMsg = document.getElementById("loading-msg");

// ================= BANNER SLIDER LOGIC =================
let currentSlide = 0;
const slider = document.getElementById('banner-slider');
let totalSlides = 0;

function updateSlider() {
    if(totalSlides > 0 && slider) {
        slider.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
}

function nextSlide() {
    if(totalSlides === 0) return;
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlider();
}

function prevSlide() {
    if(totalSlides === 0) return;
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlider();
}

setInterval(nextSlide, 5000); 

// ================= LOAD BANNERS =================
async function loadHomepageBanners() {
    try {
        const response = await fetch(BANNERS_API);
        const banners = await response.json();
        
        if (banners.length > 0 && slider) {
            slider.innerHTML = ''; 
            banners.forEach(banner => {
                slider.innerHTML += `<img src="${banner.image_url}" class="w-full h-full object-cover flex-shrink-0">`;
            });
            totalSlides = banners.length; 
        }
    } catch (error) {
        console.error("Error loading banners:", error);
    }
}

// ================= LOAD CATEGORIES =================
async function loadHomepageCategories() {
    const categoryDropdown = document.getElementById('category-dropdown');
    if(!categoryDropdown) return;
    
    try {
        const response = await fetch(CATEGORIES_API);
        const categories = await response.json();
        
        if (categories.length > 0) {
            categoryDropdown.innerHTML = '<option value="all">All Categories</option>';
            categories.forEach(cat => {
                categoryDropdown.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
            });
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// ================= LOAD PRODUCTS (UPDATED) =================
async function fetchProducts() {
    if(!productContainer) return;
    
    try {
        const response = await fetch(API_URL);
        allProducts = await response.json(); // সব প্রোডাক্ট গ্লোবালি সেভ করে রাখলাম
        
        if(loadingMsg) loadingMsg.style.display = "none";

        displayProducts(allProducts); // রেন্ডার করার জন্য নতুন ফাংশনে পাঠালাম

    } catch (error) {
        console.error("Error fetching products:", error);
        if(loadingMsg) {
            loadingMsg.innerText = "Failed to load products.";
            loadingMsg.classList.add("text-red-500");
        }
    }
}
// ================= LOAD OFFERS =================
async function loadOffers() {
    try {
        const response = await fetch(OFFERS_API);
        const offers = await response.json();
        
        const offersSection = document.getElementById('offers-section');
        const offersContainer = document.getElementById('offers-container');
        
        // যদি ডাটাবেসে অফার থাকে, তাহলে সেকশনটা শো করবে
        if (offers.length > 0) {
            offersSection.classList.remove('hidden'); // hidden ক্লাস রিমুভ করে দিলাম
            
            offersContainer.innerHTML = offers.map(off => {
                // থিম অনুযায়ী কালার সেট করা
                let gradientClass = "from-orange-400 to-red-500";
                let badgeText = "text-red-500";
                
                if (off.theme === "green") {
                    gradientClass = "from-green-500 to-emerald-700";
                    badgeText = "text-green-600";
                } else if (off.theme === "blue") {
                    gradientClass = "from-blue-400 to-indigo-600";
                    badgeText = "text-blue-600";
                }
                
                return `
                <div class="bg-gradient-to-r ${gradientClass} rounded-xl p-5 text-white shadow-md flex items-center justify-between hover:scale-[1.02] transition-transform cursor-pointer">
                    <div>
                        <span class="bg-white ${badgeText} text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide mb-2 inline-block">${off.tag}</span>
                        <h3 class="text-xl font-extrabold mb-1">${off.title}</h3>
                        <p class="text-sm opacity-90">${off.description}</p>
                    </div>
                    <i class="fa-solid ${off.icon} text-5xl opacity-80 ml-3"></i>
                </div>
                `;
            }).join('');
        } else {
            // অফার না থাকলে পুরো সেকশনটা হাইড হয়ে থাকবে
            offersSection.classList.add('hidden');
        }
    } catch (error) {
        console.error("Error loading offers:", error);
    }
}
// ================= DISPLAY PRODUCTS HTML =================
function displayProducts(products) {
    if (!productContainer) return;
    productContainer.innerHTML = ''; 

    if (products.length === 0) {
        productContainer.innerHTML = `<p class="col-span-full text-center text-choco">No products found.</p>`;
        return;
    }

    products.forEach(product => {
        const productCard = document.createElement("div");
        productCard.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-natureGreen transition-all duration-300 group flex flex-col";

        productCard.innerHTML = `
            <div class="relative overflow-hidden">
                <a href="product.html?id=${product.id}">
                    <img src="${product.image_url}" alt="${product.name}" class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500">
                </a>
            </div>
            <div class="p-4 flex flex-col flex-grow">
                <a href="product.html?id=${product.id}" class="inline-block w-max">
                    <span class="text-[10px] text-natureGreen font-bold uppercase tracking-wider bg-lightGreen px-2 py-1 rounded">${product.category}</span>
                </a>
                
                <a href="product.html?id=${product.id}">
                    <h3 class="text-sm font-semibold mt-2 text-chocoDark line-clamp-2 hover:text-natureGreen transition" title="${product.name}">${product.name}</h3>
                </a>
                
                <div class="mt-3 flex justify-between items-center mb-4">
                    <span class="text-lg font-bold text-natureGreen">৳${product.price}</span>
                    <button onclick="addToCart('${product.id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${product.image_url}')" class="bg-lightGreen text-natureGreen w-8 h-8 rounded-full hover:bg-natureGreen hover:text-white transition-colors flex items-center justify-center shadow-sm" title="Add to Cart">
                        <i class="fa-solid fa-cart-plus text-sm"></i>
                    </button>
                </div>
                
                <!-- Order Now Button -->
                <button onclick="window.location.href='product.html?id=${product.id}'" class="w-full bg-choco text-white py-2 rounded text-sm font-bold hover:bg-natureGreen transition-colors mt-auto">
                    Order Now
                </button>
            </div>
        `;
        productContainer.appendChild(productCard);
    });
}

// ================= NEW: SEARCH & FILTER LOGIC =================
function filterByCategory(categoryName) {
    if (categoryName === 'all') {
        displayProducts(allProducts);
    } else {
        const filtered = allProducts.filter(p => p.category === categoryName);
        displayProducts(filtered);
    }
}

function searchProducts(query) {
    const searchText = query.toLowerCase();
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(searchText) || 
        (p.category && p.category.toLowerCase().includes(searchText))
    );
    displayProducts(filtered);
}

// ================= NEW: VIDEO GALLERY LOGIC =================
async function loadVideos() {
    const gallery = document.getElementById('video-gallery');
    const videoLoadingMsg = document.getElementById('video-loading-msg');
    if (!gallery) return;

    try {
        const response = await fetch(VIDEOS_API);
        const videos = await response.json();
        console.log("Video Data From Backend:", videos);
        
        if(videoLoadingMsg) videoLoadingMsg.style.display = "none";

        if (videos.length === 0) {
            gallery.innerHTML = '<p class="col-span-full text-center text-gray-500">No videos uploaded yet.</p>';
            return;
        }

        gallery.innerHTML = videos.map(vid => `
            <a href="${vid.url}" target="_blank" class="block bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition group">
                <div class="relative h-48 flex items-center justify-center overflow-hidden bg-gray-100">
                    <img src="${vid.thumbnail_url}" alt="${vid.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <!-- Play Button Overlay -->
                    <div class="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-10 transition flex justify-center items-center">
                        <i class="fa-brands fa-facebook text-5xl text-white opacity-90 drop-shadow-lg group-hover:scale-110 transition-transform"></i>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-100">
                    <h3 class="font-bold text-choco text-lg group-hover:text-natureGreen transition line-clamp-2">${vid.title}</h3>
                </div>
            </a>
        `).join('');
    } catch (error) {
        console.error("Error loading videos:", error);
        if(videoLoadingMsg) {
            videoLoadingMsg.innerText = "Failed to load videos from server.";
            videoLoadingMsg.classList.add("text-red-500");
        }
    }
}

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    loadHomepageBanners();
    loadHomepageCategories();
    fetchProducts();
    loadVideos();
    loadOffers();
});