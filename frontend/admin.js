// ================= ADMIN PASSCODE LOGIC =================
const ADMIN_PRODUCTS_API = "https://sihha-natural.onrender.com/api/admin/products/";
let adminApiToken = sessionStorage.getItem("sihha_admin_api_token") || "";

function adminAuthHeaders(headers = {}) {
    return {
        ...headers,
        ...(adminApiToken ? { "X-Admin-Token": adminApiToken } : {})
    };
}

async function checkAdminStatus() {
    const loginScreen = document.getElementById('admin-login-screen');
    if (!loginScreen) return;

    if (!adminApiToken) {
        loginScreen.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch(ADMIN_PRODUCTS_API, {
            headers: { "X-Admin-Token": adminApiToken }
        });
        if (!response.ok) throw new Error("Admin token is no longer valid");
        loginScreen.classList.add('hidden');
    } catch (error) {
        adminApiToken = "";
        sessionStorage.removeItem("sihha_admin_api_token");
        loginScreen.classList.remove('hidden');
    }
}

async function checkAdminPasscode() {
    const tokenInput = document.getElementById('admin-passcode');
    const token = tokenInput.value.trim();
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch(ADMIN_PRODUCTS_API, {
            headers: { "X-Admin-Token": token }
        });
        if (!response.ok) throw new Error("Token verification failed");

        adminApiToken = token;
        sessionStorage.setItem("sihha_admin_api_token", token);
        document.getElementById('admin-login-screen').classList.add('hidden');
        if (errorMsg) errorMsg.classList.add('hidden');
        await loadAdminProducts();
    } catch (error) {
        if (errorMsg) errorMsg.classList.remove('hidden');
        tokenInput.value = '';
    }
}

function adminLogout() {
    adminApiToken = "";
    sessionStorage.removeItem("sihha_admin_api_token");
    const loginScreen = document.getElementById('admin-login-screen');
    if(loginScreen) loginScreen.classList.remove('hidden');
}

document.addEventListener("DOMContentLoaded", checkAdminStatus);

// ================= TAB SWITCHING LOGIC (UPDATED WITH VIDEOS) =================
function switchTab(tabName) {
    const tabs = ['products', 'categories', 'banners', 'orders', 'videos', 'offers', 'accounting']; // videos & offers যোগ করা হয়েছে

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
        const response = await fetch("https://sihha-natural.onrender.com/api/categories/");
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
        const response = await fetch("https://sihha-natural.onrender.com/api/categories/", {
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
        const response = await fetch(`https://sihha-natural.onrender.com/api/categories/${currentEditCategoryId}`, {
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
        const response = await fetch("https://sihha-natural.onrender.com/api/banners/");
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
        const response = await fetch("https://sihha-natural.onrender.com/api/banners/", {
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
    await fetch(`https://sihha-natural.onrender.com/api/banners/${id}`, { method: 'DELETE' });
    loadBanners();
}

// ================= PRODUCT MANAGEMENT =================
let allProductsData = []; 

async function loadAdminProducts() {
    const tableBody = document.getElementById('admin-product-list');
    try {
        const response = await fetch(ADMIN_PRODUCTS_API, {
            headers: adminAuthHeaders()
        });
        if (!response.ok) throw new Error("Could not load admin products");
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
                <td class="p-3"><img src="${escapeAccountingHtml(product.image_url)}" alt="" class="w-12 h-12 object-cover rounded shadow-sm"></td>
                <td class="p-3 font-semibold text-gray-800">${escapeAccountingHtml(product.name)}${product.weight ? `<br><span class="text-xs font-medium text-gray-500">${escapeAccountingHtml(product.weight)}</span>` : ""}<br><span class="text-xs text-green-600">${escapeAccountingHtml(product.category)}</span></td>
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
    document.getElementById('edit-product-cost-price').value = product.cost_price ?? 0;
    document.getElementById('edit-product-weight').value = product.weight || '';
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
        cost_price: parseFloat(document.getElementById('edit-product-cost-price').value),
        weight: document.getElementById('edit-product-weight').value.trim(),
        stock: parseInt(document.getElementById('edit-product-stock').value),
        description: document.getElementById('edit-product-description').value
    };

    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.innerText = "Saving...";

    try {
        const response = await fetch(`https://sihha-natural.onrender.com/api/products/${id}`, {
            method: 'PUT',
            headers: adminAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(updatedData)
        });

        if(response.ok) {
            closeEditProductModal();
            await loadAdminProducts();
        } else {
            const result = await response.json().catch(() => ({}));
            alert(result.detail || "Failed to update product");
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
        const response = await fetch(`https://sihha-natural.onrender.com/api/products/${productId}`, {
            method: 'DELETE',
            headers: adminAuthHeaders()
        });
        if(response.ok) {
            await loadAdminProducts();
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
    formData.append("cost_price", document.getElementById('cost_price').value);
    formData.append("weight", document.getElementById('weight').value.trim());
    formData.append("stock", document.getElementById('stock').value);
    formData.append("description", document.getElementById('description').value);
    formData.append("image", document.getElementById('image').files[0]);

    try {
        const response = await fetch("https://sihha-natural.onrender.com/api/products/", {
            method: "POST",
            headers: adminAuthHeaders(),
            body: formData
        });

        if (response.ok) {
            statusMsg.innerText = "✅ Product Added Successfully!";
            statusMsg.className = "text-center font-semibold mt-4 text-green-600 block";
            this.reset();
            await loadAdminProducts();
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
const ORDERS_API = "https://sihha-natural.onrender.com/api/orders/";

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
        // সবগুলো রিকোয়েস্ট একসাথে পাঠানো হচ্ছে যেন দ্রুত ডিলিট হয়
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

// ================= VIDEO MANAGEMENT =================
const VIDEOS_API = "https://sihha-natural.onrender.com/api/videos/";

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

async function deleteVideo(id) {
    if(!confirm("Are you sure you want to delete this video?")) return;
    
    try {
        const response = await fetch(`${VIDEOS_API}${id}`, { 
            method: 'DELETE' 
        });
        
        if(response.ok) {
            alert("✅ Video deleted successfully!");
            loadAdminVideos(); 
        } else {
            const err = await response.json();
            alert("❌ Failed: " + (err.detail || "Server error"));
        }
    } catch (error) {
        console.error("Delete Error:", error);
        alert("❌ Error connecting to server.");
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
                body: formData 
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

// ================= OFFERS MANAGEMENT (NEW) =================
const OFFERS_API = "https://sihha-natural.onrender.com/api/offers";

async function loadOffers() {
    try {
        const res = await fetch(OFFERS_API);
        const offers = await res.json();
        const tbody = document.getElementById('offers-table-body');
        
        if (!tbody) return;

        if (offers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">No offers running right now.</td></tr>';
            return;
        }

        tbody.innerHTML = offers.map(off => `
            <tr class="border-b hover:bg-gray-50">
                <td class="py-2 px-4 font-bold text-choco">${off.title}</td>
                <td class="py-2 px-4">
                    <span class="bg-gray-200 text-xs px-2 py-1 rounded font-semibold">${off.tag}</span> 
                    <span class="text-sm text-gray-500 ml-2">(${off.theme})</span>
                </td>
                <td class="py-2 px-4">
                    <button onclick="deleteOffer('${off.id}')" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error("Error loading offers:", error);
    }
}

document.getElementById('add-offer-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newOffer = {
        title: document.getElementById('offer-title').value,
        description: document.getElementById('offer-desc').value,
        tag: document.getElementById('offer-tag').value,
        theme: document.getElementById('offer-theme').value,
        icon: document.getElementById('offer-icon').value
    };

    try {
        const res = await fetch(OFFERS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newOffer)
        });
        if(res.ok) {
            alert("Offer added successfully!");
            document.getElementById('add-offer-form').reset();
            loadOffers();
        }
    } catch (error) {
        console.error("Error adding offer:", error);
        alert("Failed to add offer.");
    }
});

async function deleteOffer(id) {
    if(!confirm("Are you sure you want to delete this offer?")) return;
    try {
        const res = await fetch(`${OFFERS_API}/${id}`, { method: "DELETE" });
        if(res.ok) {
            loadOffers();
        }
    } catch (error) {
        console.error("Error deleting offer:", error);
    }
}

const ACCOUNTING_API = "https://sihha-natural.onrender.com/api";
let accountingOrders = [];

function getAccountingPeriod() {
    const now = new Date();
    return {
        month: document.getElementById("accounting-month")?.value || String(now.getMonth() + 1),
        year: document.getElementById("accounting-year")?.value || String(now.getFullYear())
    };
}

function accountingPeriodQuery() {
    return new URLSearchParams(getAccountingPeriod()).toString();
}

function initializeAccountingPeriod() {
    const now = new Date();
    document.getElementById("accounting-month").value = String(now.getMonth() + 1);
    document.getElementById("accounting-year").value = String(now.getFullYear());
}

function escapeAccountingHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatAccountingMoney(value) {
    return new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function formatAccountingDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function accountingBillLink(url) {
    if (!url) return "-";
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "https:") return "-";
        return `<a href="${escapeAccountingHtml(parsedUrl.href)}" target="_blank" rel="noopener noreferrer" class="font-semibold text-sky-700 underline">View Bill</a>`;
    } catch {
        return "-";
    }
}

async function accountingRequest(path, options = {}) {
    const response = await fetch(`${ACCOUNTING_API}${path}`, options);
    if (!response.ok) {
        let message = `Request failed (${response.status})`;
        try {
            const detail = await response.json();
            message = detail.detail || detail.message || message;
        } catch {
            // Keep the HTTP status message when the response is not JSON.
        }
        throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
}

async function loadMonthlyAnalytics() {
    try {
        const data = await accountingRequest(`/analytics/monthly?${accountingPeriodQuery()}`);
        document.getElementById("analytics-monthly-revenue").textContent = formatAccountingMoney(data.monthly_revenue);
        document.getElementById("analytics-gross-profit").textContent = formatAccountingMoney(data.monthly_gross_profit);
        document.getElementById("analytics-monthly-expenses").textContent = formatAccountingMoney(data.monthly_expenses);
        document.getElementById("analytics-net-profit").textContent = formatAccountingMoney(data.monthly_net_profit);
        document.getElementById("analytics-stock-investment").textContent = formatAccountingMoney(data.total_stock_investment);
        document.getElementById("analytics-remaining-stock").textContent = formatAccountingMoney(data.remaining_stock_value);
    } catch (error) {
        console.error("Monthly analytics error:", error);
    }
}

async function loadSalesHistory() {
    const tbody = document.getElementById("sales-history-body");
    try {
        accountingOrders = await accountingRequest(`/orders/?${accountingPeriodQuery()}`);
        if (!accountingOrders.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">No sales recorded.</td></tr>';
            return;
        }
        tbody.innerHTML = accountingOrders.map(order => {
            const items = (order.items || []).map(item =>
                `${escapeAccountingHtml(item.name)} × ${Number(item.quantity) || 0}`
            ).join("<br>");
            return `<tr>
                <td class="p-3">${escapeAccountingHtml(formatAccountingDate(order.created_at))}</td>
                <td class="p-3">${escapeAccountingHtml(order.customer_name || "Walk-in")}</td>
                <td class="p-3 capitalize">${escapeAccountingHtml(order.order_type || "online")}</td>
                <td class="p-3">${items || "-"}</td>
                <td class="p-3 font-semibold">${formatAccountingMoney(order.total)}</td>
                <td class="p-3 font-semibold text-emerald-700">${formatAccountingMoney(order.total_profit)}</td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button type="button" onclick="editSale('${order.id}')" class="mr-2 rounded border px-3 py-1 text-sky-700 hover:bg-sky-50">Edit</button>
                    <button type="button" onclick="deleteSale('${order.id}')" class="rounded border border-rose-200 px-3 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
                </td>
            </tr>`;
        }).join("");
    } catch (error) {
        console.error("Sales history error:", error);
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-rose-600">Could not load sales.</td></tr>';
    }
}

async function loadExpenseHistory() {
    const tbody = document.getElementById("expenses-history-body");
    try {
        const expenses = await accountingRequest(`/expenses/?${accountingPeriodQuery()}`);
        if (!expenses.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">No expenses recorded.</td></tr>';
            return;
        }
        tbody.innerHTML = expenses.map(expense => `<tr>
            <td class="p-3">${escapeAccountingHtml(formatAccountingDate(expense.date))}</td>
            <td class="p-3 font-medium">${escapeAccountingHtml(expense.title)}</td>
            <td class="p-3">${escapeAccountingHtml(expense.category)}</td>
            <td class="p-3">${escapeAccountingHtml(expense.shop_name || "-")}</td>
            <td class="p-3 font-semibold">${formatAccountingMoney(expense.amount)}</td>
            <td class="p-3">${accountingBillLink(expense.bill_image_url)}</td>
            <td class="p-3 text-right whitespace-nowrap">
                <button type="button" onclick="editExpense('${expense.id}')" class="mr-2 rounded border px-3 py-1 text-sky-700 hover:bg-sky-50">Edit</button>
                <button type="button" onclick="deleteExpense('${expense.id}')" class="rounded border border-rose-200 px-3 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
            </td>
        </tr>`).join("");
    } catch (error) {
        console.error("Expenses history error:", error);
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-rose-600">Could not load expenses.</td></tr>';
    }
}

async function loadInventoryPurchaseHistory() {
    const tbody = document.getElementById("inventory-history-body");
    try {
        const purchases = await accountingRequest("/inventory-purchases/");
        if (!purchases.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">No inventory purchases recorded.</td></tr>';
            return;
        }
        tbody.innerHTML = purchases.map(purchase => `<tr>
            <td class="p-3">${escapeAccountingHtml(formatAccountingDate(purchase.date))}</td>
            <td class="p-3 font-medium">${escapeAccountingHtml(purchase.item_name)}</td>
            <td class="p-3">${escapeAccountingHtml(purchase.supplier_name || "-")}</td>
            <td class="p-3 font-semibold">${formatAccountingMoney(purchase.amount)}</td>
            <td class="p-3">${accountingBillLink(purchase.bill_image_url)}</td>
            <td class="p-3 text-right whitespace-nowrap">
                <button type="button" onclick="editInventoryPurchase('${purchase.id}')" class="mr-2 rounded border px-3 py-1 text-sky-700 hover:bg-sky-50">Edit</button>
                <button type="button" onclick="deleteInventoryPurchase('${purchase.id}')" class="rounded border border-rose-200 px-3 py-1 text-rose-700 hover:bg-rose-50">Delete</button>
            </td>
        </tr>`).join("");
    } catch (error) {
        console.error("Inventory purchase history error:", error);
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-rose-600">Could not load inventory purchases.</td></tr>';
    }
}

async function refreshAccounting() {
    await Promise.all([
        loadMonthlyAnalytics(),
        loadSalesHistory(),
        loadExpenseHistory(),
        loadInventoryPurchaseHistory()
    ]);
}

function scrollToAccountingHistory(sectionId) {
    switchTab("accounting");
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadOfflineSaleProducts() {
    const select = document.getElementById("offline-sale-product");
    try {
        const products = await accountingRequest("/products/");
        select.replaceChildren(new Option("Select a product", ""));
        products.forEach(product => {
            const option = new Option(product.name, product.id);
            option.dataset.name = product.name;
            option.dataset.price = product.price;
            select.add(option);
        });
    } catch (error) {
        console.error("Could not load products for offline sale:", error);
        select.replaceChildren(new Option("Products unavailable", ""));
    }
}

function updateOfflineSaleMode() {
    const customMode = document.querySelector('input[name="offline-item-mode"]:checked')?.value === "custom";
    document.getElementById("offline-existing-fields").classList.toggle("hidden", customMode);
    document.getElementById("offline-custom-fields").classList.toggle("hidden", !customMode);
    document.getElementById("offline-sale-product").required = !customMode;
    document.getElementById("offline-sale-price").required = !customMode;
    document.getElementById("offline-custom-name").required = customMode;
    document.getElementById("offline-custom-selling-price").required = customMode;
    document.getElementById("offline-custom-cost-price").required = customMode;
}

document.querySelectorAll('input[name="offline-item-mode"]').forEach(input => {
    input.addEventListener("change", updateOfflineSaleMode);
});

document.getElementById("offline-sale-product").addEventListener("change", event => {
    const selected = event.target.selectedOptions[0];
    if (selected?.dataset.price) {
        document.getElementById("offline-sale-price").value = selected.dataset.price;
    }
});

document.getElementById("expense-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        await accountingRequest("/expenses/", {
            method: "POST",
            body: new FormData(form)
        });
        form.reset();
        await refreshAccounting();
        alert("Expense saved.");
    } catch (error) {
        console.error("Expense submission error:", error);
        alert(`Could not save expense: ${error.message}`);
    }
});

document.getElementById("inventory-purchase-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
        await accountingRequest("/inventory-purchases/", {
            method: "POST",
            body: new FormData(form)
        });
        form.reset();
        await refreshAccounting();
        alert("Inventory purchase saved.");
    } catch (error) {
        console.error("Inventory purchase submission error:", error);
        alert(`Could not save purchase: ${error.message}`);
    }
});

document.getElementById("offline-sale-form").addEventListener("submit", async event => {
    event.preventDefault();
    const saleForm = document.getElementById("offline-sale-form");
    if (!saleForm) return;
    const customMode = document.querySelector('input[name="offline-item-mode"]:checked')?.value === "custom";
    const quantity = Number(document.getElementById("offline-sale-quantity").value);
    let item;

    if (customMode) {
        const customPrice = Number(document.getElementById("offline-custom-selling-price").value);
        const customCost = Number(document.getElementById("offline-custom-cost-price").value);
        const customName = document.getElementById("offline-custom-name").value.trim();
        if (!customName || !Number.isFinite(customPrice) || customPrice <= 0 || !Number.isFinite(customCost) || customCost < 0) {
            alert("Enter a custom product name and valid selling and cost prices.");
            return;
        }
        item = {
            custom_product_name: customName,
            custom_selling_price: customPrice,
            custom_cost_price: customCost,
            quantity
        };
    } else {
        const select = document.getElementById("offline-sale-product");
        const selected = select.selectedOptions[0];
        const price = Number(document.getElementById("offline-sale-price").value);
        if (!selected?.value || !Number.isFinite(price) || price <= 0) {
            alert("Select a product and enter a valid selling price.");
            return;
        }
        item = { product_id: selected.value, name: selected.dataset.name, price, quantity };
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Enter a valid quantity.");
        return;
    }

    const unitPrice = customMode ? item.custom_selling_price : item.price;
    const subtotal = unitPrice * quantity;
    const saleDate = document.getElementById("offline-sale-date").value;
    const sale = {
        customer_name: "Walk-in customer",
        customer_phone: "N/A",
        delivery_area: "Offline",
        address: "In-store sale",
        items: [item],
        subtotal,
        delivery_charge: 0,
        total: subtotal,
        order_type: "offline",
        ...(saleDate ? { date: saleDate } : {})
    };

    try {
        await accountingRequest("/orders/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sale)
        });
        saleForm.reset();
        updateOfflineSaleMode();
        await Promise.all([refreshAccounting(), fetchOrders(), loadOfflineSaleProducts()]);
        alert("Offline sale saved.");
    } catch (error) {
        console.error("Offline sale submission error:", error);
        alert(`Could not save offline sale: ${error.message}`);
    }
});

async function deleteSale(orderId) {
    if (!confirm("Delete this sale? Its profit and revenue will be removed from analytics.")) return;
    try {
        await accountingRequest(`/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
        await Promise.all([refreshAccounting(), fetchOrders()]);
    } catch (error) {
        alert(`Could not delete sale: ${error.message}`);
    }
}

function openSaleEdit(order) {
    document.getElementById("edit-sale-id").value = order.id;
    document.getElementById("edit-sale-customer").value = order.customer_name || "";
    document.getElementById("edit-sale-phone").value = order.customer_phone || "";
    document.getElementById("edit-sale-area").value = order.delivery_area || "";
    document.getElementById("edit-sale-address").value = order.address || "";
    document.getElementById("edit-sale-type").value = order.order_type || "online";
    document.getElementById("edit-sale-subtotal").value = order.subtotal ?? 0;
    document.getElementById("edit-sale-delivery").value = order.delivery_charge ?? 0;
    document.getElementById("edit-sale-total").value = order.total ?? 0;
    document.getElementById("edit-sale-items").value = JSON.stringify(order.items || [], null, 2);
    const modal = document.getElementById("edit-sale-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function editSale(orderId) {
    const order = accountingOrders.find(item => item.id === orderId);
    if (order) openSaleEdit(order);
}

function closeSaleEdit() {
    const modal = document.getElementById("edit-sale-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

document.getElementById("edit-sale-form").addEventListener("submit", async event => {
    event.preventDefault();
    const orderId = document.getElementById("edit-sale-id").value;
    let items;
    try {
        items = JSON.parse(document.getElementById("edit-sale-items").value);
        if (!Array.isArray(items) || items.length === 0) throw new Error("Items must be a non-empty JSON array");
    } catch (error) {
        alert(`Invalid items JSON: ${error.message}`);
        return;
    }

    const order = {
        customer_name: document.getElementById("edit-sale-customer").value.trim(),
        customer_phone: document.getElementById("edit-sale-phone").value.trim(),
        delivery_area: document.getElementById("edit-sale-area").value.trim(),
        address: document.getElementById("edit-sale-address").value.trim(),
        order_type: document.getElementById("edit-sale-type").value,
        items,
        subtotal: Number(document.getElementById("edit-sale-subtotal").value),
        delivery_charge: Number(document.getElementById("edit-sale-delivery").value),
        total: Number(document.getElementById("edit-sale-total").value)
    };

    try {
        await accountingRequest(`/orders/${encodeURIComponent(orderId)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
        });
        closeSaleEdit();
        await Promise.all([refreshAccounting(), fetchOrders()]);
    } catch (error) {
        alert(`Could not update sale: ${error.message}`);
    }
});

function toDateTimeLocal(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const pad = part => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function openLedgerEdit(kind, record) {
    const isExpense = kind === "expense";
    const fields = isExpense
        ? [
            ["title", "Title", "text", record.title, true],
            ["amount", "Amount (৳)", "number", record.amount, true],
            ["category", "Category", "text", record.category, true],
            ["shop_name", "Shop name (optional)", "text", record.shop_name || "", false],
            ["date", "Date and time", "datetime-local", toDateTimeLocal(record.date), true]
        ]
        : [
            ["item_name", "Item name", "text", record.item_name, true],
            ["amount", "Amount (৳)", "number", record.amount, true],
            ["supplier_name", "Supplier (optional)", "text", record.supplier_name || "", false],
            ["date", "Date and time", "datetime-local", toDateTimeLocal(record.date), true]
        ];

    document.getElementById("ledger-edit-id").value = record.id;
    document.getElementById("ledger-edit-type").value = kind;
    document.getElementById("ledger-edit-heading").textContent = isExpense ? "Edit Expense" : "Edit Inventory Purchase";
    document.getElementById("ledger-edit-fields").innerHTML = fields.map(([name, label, type, value, required]) => `
        <div>
            <label for="ledger-field-${name}" class="mb-1 block text-sm font-semibold text-gray-700">${label}</label>
            <input id="ledger-field-${name}" name="${name}" type="${type}" value="${escapeAccountingHtml(value)}" ${type === "number" ? 'min="0" step="0.01"' : ""} ${required ? "required" : ""} class="w-full rounded border p-2">
        </div>
    `).join("");
    document.getElementById("ledger-edit-bill").value = "";
    const modal = document.getElementById("ledger-edit-modal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
}

function closeLedgerEdit() {
    const modal = document.getElementById("ledger-edit-modal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
}

document.getElementById("ledger-edit-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const kind = document.getElementById("ledger-edit-type").value;
    const recordId = document.getElementById("ledger-edit-id").value;
    const endpoint = kind === "expense" ? "expenses" : "inventory-purchases";

    try {
        await accountingRequest(`/${endpoint}/${encodeURIComponent(recordId)}`, {
            method: "PUT",
            body: new FormData(form)
        });
        closeLedgerEdit();
        await refreshAccounting();
    } catch (error) {
        alert(`Could not update record: ${error.message}`);
    }
});

async function editExpense(expenseId) {
    try {
        const expense = await accountingRequest(`/expenses/${encodeURIComponent(expenseId)}`);
        openLedgerEdit("expense", expense);
    } catch (error) {
        alert(`Could not load expense: ${error.message}`);
    }
}

async function deleteExpense(expenseId) {
    if (!confirm("Delete this expense?")) return;
    try {
        await accountingRequest(`/expenses/${encodeURIComponent(expenseId)}`, { method: "DELETE" });
        await refreshAccounting();
    } catch (error) {
        alert(`Could not delete expense: ${error.message}`);
    }
}

async function editInventoryPurchase(purchaseId) {
    try {
        const purchase = await accountingRequest(`/inventory-purchases/${encodeURIComponent(purchaseId)}`);
        openLedgerEdit("inventory", purchase);
    } catch (error) {
        alert(`Could not load purchase: ${error.message}`);
    }
}

async function deleteInventoryPurchase(purchaseId) {
    if (!confirm("Delete this inventory purchase? This changes stock valuation.")) return;
    try {
        await accountingRequest(`/inventory-purchases/${encodeURIComponent(purchaseId)}`, { method: "DELETE" });
        await refreshAccounting();
    } catch (error) {
        alert(`Could not delete purchase: ${error.message}`);
    }
}

async function downloadCurrentMonthReport() {
    const button = document.getElementById("download-monthly-report-btn");
    const status = document.getElementById("report-download-status");
    if (!button) return;

    const { month, year } = getAccountingPeriod();
    button.disabled = true;
    if (status) status.textContent = "Preparing CSV report...";
    try {
        const response = await fetch(`${ACCOUNTING_API}/reports/monthly/download?${accountingPeriodQuery()}`);
        if (!response.ok) throw new Error(`Report download failed (${response.status})`);

        const reportBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(reportBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `sihha-monthly-report-${year}-${String(month).padStart(2, "0")}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
        if (status) status.textContent = "CSV report downloaded.";
    } catch (error) {
        console.error("Monthly report download error:", error);
        if (status) status.textContent = "Could not download the report.";
        alert(`Could not download report: ${error.message}`);
    } finally {
        button.disabled = false;
    }
}

document.getElementById("download-monthly-report-btn")?.addEventListener("click", downloadCurrentMonthReport);
document.getElementById("accounting-month")?.addEventListener("change", refreshAccounting);
document.getElementById("accounting-year")?.addEventListener("change", refreshAccounting);

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
    initializeAccountingPeriod();
    document.getElementById("refresh-btn")?.addEventListener("click", refreshAccounting);
    refreshAccounting();
    loadOfflineSaleProducts();
    updateOfflineSaleMode();
    loadCategories();
    loadBanners();
    loadAdminProducts();
    fetchOrders();
    loadAdminVideos(); 
    loadOffers(); // অফার লোড কল করা হলো
    setInterval(fetchOrders, 30000); // প্রতি 30 সেকেন্ডে অর্ডার চেক করবে
});