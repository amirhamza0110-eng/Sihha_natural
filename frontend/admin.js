// ================= ADMIN PASSCODE LOGIC =================
const MASTER_PASSCODE = "hamza1711"; 

function checkAdminStatus() {
    const loginScreen = document.getElementById('admin-login-screen');
    if (!loginScreen) return;
    
    // localStorage er bodole sessionStorage deya holo
    const isUnlocked = sessionStorage.getItem('sihha_admin_unlocked');
    if (isUnlocked === 'true') {
        loginScreen.classList.add('hidden');
    } else {
        loginScreen.classList.remove('hidden');
    }
}

function checkAdminPasscode() {
    const input = document.getElementById('admin-passcode').value;
    const errorMsg = document.getElementById('login-error');

    if (input === MASTER_PASSCODE) {
        sessionStorage.setItem('sihha_admin_unlocked', 'true');
        document.getElementById('admin-login-screen').classList.add('hidden');
        if(errorMsg) errorMsg.classList.add('hidden');
    } else {
        if(errorMsg) errorMsg.classList.remove('hidden');
        document.getElementById('admin-passcode').value = '';
    }
}

function adminLogout() {
    sessionStorage.removeItem('sihha_admin_unlocked');
    const loginScreen = document.getElementById('admin-login-screen');
    if(loginScreen) loginScreen.classList.remove('hidden');
}

document.addEventListener("DOMContentLoaded", checkAdminStatus);

// ================= TAB SWITCHING LOGIC (UPDATED WITH VIDEOS) =================
function switchTab(tabName) {
    const tabs = ['products', 'categories', 'banners', 'orders', 'videos']; // videos যোগ করা হয়েছে

    tabs.forEach(t => {
        // সব সেকশন হাইড করা
        const section = document.getElementById(`section-${t}`);
        if (section) section.classList.add('hidden');

        // সব বাটনের কালার রিসেট করা
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            btn.classList.remove('bg-natureGreen');
            btn.classList.add('hover:bg-gray-700');
        }
    });

    // শুধু ক্লিক করা সেকশনটি শো করা
    const activeSection = document.getElementById(`section-${tabName}`);
    if (activeSection) activeSection.classList.remove('hidden');

    // ক্লিক করা বাটনে সবুজ কালার দেওয়া
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) {
        activeBtn.classList.remove('hover:bg-gray-700');
        activeBtn.classList.add('bg-natureGreen');
    }
}

// ================= CATEGORY MANAGEMENT =================
async function loadCategories() {
    const catList = document.getElementById('category-list');
    const productCatSelect = document.getElementById('category');
    
    try {
        const response = await fetch("https://https://sihha-natural.onrender.com/api/categories/");
        const categories = await response.json();
        
        catList.innerHTML = '';
        productCatSelect.innerHTML = ''; 

        if(categories.length === 0) {
            catList.innerHTML = `<li class="text-center text-gray-500">No categories found.</li>`;
            return;
        }

        categories.forEach(cat => {
            catList.innerHTML += `
                <li class="flex justify-between items-center bg-gray-50 p-3 rounded border">
                    <span class="font-semibold text-gray-700">${cat.name}</span>
                    <div class="flex gap-2">
                        <button onclick="openEditCategoryModal('${cat.id}', '${cat.name}')" class="text-blue-500 hover:text-blue-700 px-2" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button onclick="deleteCategory('${cat.id}')" class="text-red-500 hover:text-red-700 px-2" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </li>
            `;
            productCatSelect.innerHTML += `<option value="${cat.name}">${cat.name}</option>`;
        });
    } catch (error) {
        console.error("Error loading categories", error);
    }
}

async function addCategory() {
    const nameInput = document.getElementById('new-category-name');
    const name = nameInput.value.trim();
    
    if(!name) return alert("Please enter a category name!");

    try {
        const response = await fetch("https://https://sihha-natural.onrender.com/api/categories/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name })
        });
        
        if(response.ok) {
            nameInput.value = ''; 
            loadCategories(); 
        } else {
            const err = await response.json();
            alert(err.detail || "Failed to add category");
        }
    } catch(e) {
        alert("Server error connecting to backend.");
    }
}

async function deleteVideo(id) {
    if(!confirm("Are you sure you want to delete this video?")) return;
    
    try {
        const response = await fetch(`https://https://sihha-natural.onrender.com/api/videos/${id}`, { 
            method: 'DELETE' 
        });
        
        if(response.ok) {
            alert("✅ Video deleted successfully!");
            loadAdminVideos(); // লিস্ট সাথে সাথে আপডেট হবে
        } else {
            const err = await response.json();
            alert("❌ Failed: " + (err.detail || "Server error"));
        }
    } catch (error) {
        console.error("Delete Error:", error);
        alert("❌ Error connecting to server.");
    }
}

// === Edit Category Logic ===
let currentEditCategoryId = null;

function openEditCategoryModal(id, currentName) {
    currentEditCategoryId = id;
    document.getElementById('edit-category-old-name').value = currentName;
    document.getElementById('edit-category-new-name').value = currentName;
    document.getElementById('edit-category-modal').classList.remove('hidden');
}

function closeEditCategoryModal() {
    document.getElementById('edit-category-modal').classList.add('hidden');
    currentEditCategoryId = null;
}

document.getElementById('edit-category-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const newName = document.getElementById('edit-category-new-name').value.trim();
    if(!newName) return;

    try {
        const response = await fetch(`https://https://sihha-natural.onrender.com/api/categories/${currentEditCategoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if(response.ok) {
            closeEditCategoryModal();
            loadCategories();
        } else {
            alert("Failed to update category.");
        }
    } catch(e) {
        alert("Server error.");
    }
});

// ================= BANNER MANAGEMENT =================
async function loadBanners() {
    const bannerList = document.getElementById('banner-list');
    try {
        const response = await fetch("https://https://sihha-natural.onrender.com/api/banners/");
        const banners = await response.json();
        
        bannerList.innerHTML = '';
        if(banners.length === 0) {
            bannerList.innerHTML = `<p class="col-span-full text-center text-gray-500">No banners uploaded yet.</p>`;
            return;
        }

        banners.forEach(banner => {
            bannerList.innerHTML += `
                <div class="relative bg-white rounded-lg shadow-md overflow-hidden group">
                    <img src="${banner.image_url}" class="w-full h-32 object-cover">
                    <button onclick="deleteBanner('${banner.id}')" class="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        });
    } catch(e) {
        console.error("Error loading banners", e);
    }
}

async function uploadBanner() {
    const fileInput = document.getElementById('banner-image');
    const btn = document.getElementById('banner-upload-btn');
    if(!fileInput.files[0]) return alert("Please select an image!");

    btn.innerText = "Uploading...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    try {
        const response = await fetch("https://https://sihha-natural.onrender.com/api/banners/", {
            method: "POST",
            body: formData
        });
        if(response.ok) {
            fileInput.value = '';
            loadBanners();
        } else {
            alert("Failed to upload banner.");
        }
    } catch(e) {
        alert("Server Error.");
    } finally {
        btn.innerText = "Upload";
        btn.disabled = false;
    }
}

async function deleteBanner(id) {
    if(!confirm("Delete this banner?")) return;
    await fetch(`https://https://sihha-natural.onrender.com/api/banners/${id}`, { method: 'DELETE' });
    loadBanners();
}

// ================= PRODUCT MANAGEMENT =================
let allProductsData = []; 

async function loadAdminProducts() {
    const tableBody = document.getElementById('admin-product-list');
    try {
        const response = await fetch("https://https://sihha-natural.onrender.com/api/products/");
        const products = await response.json();
        
        allProductsData = products; 
        tableBody.innerHTML = ''; 

        if(products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">No products found.</td></tr>`;
            return;
        }

        products.forEach(product => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50 transition border-b";
            tr.innerHTML = `
                <td class="p-3"><img src="${product.image_url}" class="w-12 h-12 object-cover rounded shadow-sm"></td>
                <td class="p-3 font-semibold text-gray-800">${product.name} <br><span class="text-xs text-green-600">${product.category}</span></td>
                <td class="p-3 font-bold text-gray-700">৳${product.price}</td>
                <td class="p-3 text-right">
                    <button onclick="openEditProductModal('${product.id}')" class="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-500 hover:text-white transition mr-2">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button onclick="deleteProduct('${product.id}')" class="bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Failed to load products.</td></tr>`;
    }
}

// === Edit Product Logic ===
function openEditProductModal(productId) {
    const product = allProductsData.find(p => p.id === productId);
    if(!product) return;

    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-stock').value = product.stock;
    document.getElementById('edit-product-description').value = product.description;

    document.getElementById('edit-product-modal').classList.remove('hidden');
}

function closeEditProductModal() {
    document.getElementById('edit-product-modal').classList.add('hidden');
}

document.getElementById('edit-product-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-product-id').value;
    
    const updatedData = {
        name: document.getElementById('edit-product-name').value,
        price: parseFloat(document.getElementById('edit-product-price').value),
        stock: parseInt(document.getElementById('edit-product-stock').value),
        description: document.getElementById('edit-product-description').value
    };

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.innerText = "Saving...";

    try {
        const response = await fetch(`https://https://sihha-natural.onrender.com/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if(response.ok) {
            closeEditProductModal();
            loadAdminProducts();
        } else {
            alert("Failed to update product");
        }
    } catch(e) {
        alert("Server error connecting to backend.");
    } finally {
        submitBtn.innerText = "Save Changes";
    }
});

async function deleteProduct(productId) {
    if(!confirm("Are you sure you want to delete this product?")) return;
    try {
        const response = await fetch(`https://https://sihha-natural.onrender.com/api/products/${productId}`, { method: 'DELETE' });
        if(response.ok) {
            loadAdminProducts(); 
        } else {
            alert("Failed to delete product.");
        }
    } catch (error) {
        alert("Error connecting to server.");
    }
}

// Product Upload Form Submit Logic
document.getElementById('add-product-form').addEventListener('submit', async function(e) {
    e.preventDefault(); 
    const submitBtn = this.querySelector('button[type="submit"]');
    const statusMsg = document.getElementById('status-message');
    
    submitBtn.innerText = "Uploading...";
    submitBtn.disabled = true;
    statusMsg.classList.add('hidden');

    const formData = new FormData();
    formData.append("name", document.getElementById('name').value);
    formData.append("category", document.getElementById('category').value);
    formData.append("price", document.getElementById('price').value);
    formData.append("stock", document.getElementById('stock').value);
    formData.append("description", document.getElementById('description').value);
    formData.append("image", document.getElementById('image').files[0]);

    try {
        const response = await fetch("https://https://sihha-natural.onrender.com/api/products/", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            statusMsg.innerText = "✅ Product Added Successfully!";
            statusMsg.className = "text-center font-semibold mt-4 text-green-600 block";
            this.reset(); 
            loadAdminProducts(); 
        } else {
            statusMsg.innerText = "❌ Failed to add product.";
            statusMsg.className = "text-center font-semibold mt-4 text-red-600 block";
        }
    } catch (error) {
        statusMsg.innerText = "❌ Error connecting to server.";
        statusMsg.className = "text-center font-semibold mt-4 text-red-600 block";
    } finally {
        submitBtn.innerText = "Upload Product";
        submitBtn.disabled = false;
    }
});

// ================= LOAD ORDERS & NOTIFICATIONS =================
const ORDERS_API = "https://https://sihha-natural.onrender.com/api/orders/";

async function fetchOrders() {
    try {
        const response = await fetch(ORDERS_API);
        const orders = await response.json();
        
        const ordersContainer = document.getElementById('admin-orders-list');
        const badge = document.getElementById('order-notification-badge');
        
        if(!ordersContainer) return;
        ordersContainer.innerHTML = '';

        let pendingCount = 0;

        orders.forEach(order => {
            if (order.status === "Pending") pendingCount++;

            const date = new Date(order.created_at).toLocaleString();
            let itemsHtml = '<ul class="list-disc pl-4">';
            order.items.forEach(item => {
                itemsHtml += `<li>${item.name} <span class="text-gray-500">(${item.quantity}pcs)</span></li>`;
            });
            itemsHtml += '</ul>';

            const statusColor = order.status === "Pending" ? "bg-red-100 text-red-700" : 
                               (order.status === "Delivered" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700");

            ordersContainer.innerHTML += `
                <tr class="hover:bg-gray-50 transition border-b">
                    <td class="p-4 text-center">
                        <input type="checkbox" class="order-checkbox w-4 h-4 cursor-pointer accent-natureGreen" value="${order.id}" onchange="toggleBulkDeleteBtn()">
                    </td>
                    <td class="p-4 text-gray-600">${date}</td>
                    <td class="p-4">
                        <div class="font-bold text-chocoDark">${order.customer_name}</div>
                        <div class="text-gray-600"><i class="fa-solid fa-phone text-xs"></i> ${order.customer_phone}</div>
                        <div class="text-gray-500 text-xs mt-1 w-48 truncate" title="${order.address}">${order.address} <br> <span class="font-semibold text-natureGreen">(${order.delivery_area})</span></div>
                    </td>
                    <td class="p-4">${itemsHtml}</td>
                    <td class="p-4 font-bold text-natureGreen">
                        ৳${order.total}<br>
                        <span class="text-xs text-gray-500 font-normal">(Incl. ৳${order.delivery_charge} delivery)</span>
                    </td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded text-xs font-bold ${statusColor}">${order.status}</span>
                    </td>
                    <td class="p-4 text-right">
                        <select onchange="updateOrderStatus('${order.id}', this.value)" class="border p-1 rounded text-sm outline-none focus:ring-1 focus:ring-natureGreen bg-gray-50">
                            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                </tr>
            `;
        });

        // নোটিফিকেশন ব্যাজ আপডেট
        if (badge) {
            if (pendingCount > 0) {
                badge.innerText = pendingCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error("Error fetching orders:", error);
    }
}

// ================= BULK DELETE LOGIC =================
function toggleAllOrders(source) {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    toggleBulkDeleteBtn();
}

function toggleBulkDeleteBtn() {
    const checkboxes = document.querySelectorAll('.order-checkbox:checked');
    const bulkBtn = document.getElementById('bulk-delete-btn');
    if (checkboxes.length > 0) {
        bulkBtn.classList.remove('hidden');
    } else {
        bulkBtn.classList.add('hidden');
        document.getElementById('select-all-orders').checked = false;
    }
}

async function deleteSelectedOrders() {
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    if (checkedBoxes.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${checkedBoxes.length} order(s)? This cannot be undone.`)) return;

    const bulkBtn = document.getElementById('bulk-delete-btn');
    bulkBtn.innerText = "Deleting...";
    bulkBtn.disabled = true;

    const idsToDelete = Array.from(checkedBoxes).map(cb => cb.value);

    try {
        // সবগুলো রিকোয়েস্ট একসাথে পাঠানো হচ্ছে যেন দ্রুত ডিলিট হয়
        await Promise.all(idsToDelete.map(id => 
            fetch(`${ORDERS_API}${id}`, { method: 'DELETE' })
        ));
        
        alert(`✅ ${checkedBoxes.length} order(s) deleted successfully!`);
        document.getElementById('select-all-orders').checked = false;
        toggleBulkDeleteBtn();
        fetchOrders(); // টেবিল রিফ্রেশ করা
    } catch (error) {
        console.error("Error deleting orders:", error);
        alert("❌ Failed to delete some orders.");
    } finally {
        bulkBtn.innerHTML = `<i class="fa-solid fa-trash mr-2"></i> Delete Selected`;
        bulkBtn.disabled = false;
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${ORDERS_API}${orderId}/status?status=${newStatus}`, { method: 'PUT' });
        if(response.ok) {
            fetchOrders(); 
        } else {
            alert("Failed to update status.");
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

// ================= VIDEO MANAGEMENT (NEW) =================
const VIDEOS_API = "https://https://sihha-natural.onrender.com/api/videos/";

async function loadAdminVideos() {
    const videoList = document.getElementById('admin-video-list');
    if (!videoList) return;

    try {
        const response = await fetch(VIDEOS_API);
        const videos = await response.json();
        
        videoList.innerHTML = '';
        if(videos.length === 0) {
            videoList.innerHTML = `<p class="col-span-full text-center text-gray-500">No videos uploaded yet.</p>`;
            return;
        }

        videos.forEach(vid => {
            videoList.innerHTML += `
                <div class="bg-gray-50 rounded-lg p-4 border relative group hover:shadow-md transition">
                    <div class="flex items-start justify-between">
                        <div>
                            <h4 class="font-bold text-chocoDark line-clamp-1" title="${vid.title}">${vid.title}</h4>
                            <a href="${vid.url}" target="_blank" class="text-sm text-blue-500 hover:underline truncate w-48 inline-block"><i class="fa-solid fa-link"></i> ${vid.url}</a>
                        </div>
                        <button onclick="deleteVideo('${vid.id}')" class="text-red-500 hover:text-red-700 bg-red-100 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Video">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        console.error("Error loading videos", e);
        videoList.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load videos.</p>`;
    }
}

// Video Form Submit Logic
const videoForm = document.getElementById('add-video-form');
if (videoForm) {
    videoForm.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        const submitBtn = this.querySelector('button[type="submit"]');
        const statusMsg = document.getElementById('video-status-message');
        
        submitBtn.innerText = "Saving...";
        submitBtn.disabled = true;
        statusMsg.classList.add('hidden');

        const formData = new FormData();
        formData.append("title", document.getElementById('video-title').value);
        formData.append("url", document.getElementById('video-url').value);
        formData.append("thumbnail", document.getElementById('video-thumbnail').files[0]);

        try {
            const response = await fetch(VIDEOS_API, {
                method: "POST",
                body: formData // Ekhane JSON er bodole FormData pathano hocche
            });

            if (response.ok) {
                statusMsg.innerText = "✅ Video Saved Successfully!";
                statusMsg.className = "text-center font-semibold mt-4 text-green-600 block";
                this.reset(); 
                loadAdminVideos(); 
            } else {
                statusMsg.innerText = "❌ Failed to save video.";
                statusMsg.className = "text-center font-semibold mt-4 text-red-600 block";
            }
        } catch (error) {
            statusMsg.innerText = "❌ Error connecting to server.";
            statusMsg.className = "text-center font-semibold mt-4 text-red-600 block";
        } finally {
            submitBtn.innerText = "Save Video";
            submitBtn.disabled = false;
        }
    });
}

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadBanners();
    loadAdminProducts();
    fetchOrders();
    loadAdminVideos(); // লোড ভিডিও কল করা হলো
    setInterval(fetchOrders, 30000); // প্রতি 30 সেকেন্ডে অর্ডার চেক করবে
});