// Variable global para la altura de la navegación fija (necesaria para el scroll)
const FIXED_NAV_HEIGHT = 215;
const FIXED_OFFSET = 190;

let products = [];
let collections = {};
let cart = []; 

// URL PÚBLICA DE TU HOJA DE CÁLCULO (FORMATO TSV) - ÚNICO CAMBIO REQUERIDO
const DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQu2ejOkyQZAoepKZflAMJ0NoMXTwWJ1odRNRvhlqRZB_yvN52_EAzICIPtoHpcqZnzFAcJ1V7bbi8W/pub?gid=191336721&single=true&output=tsv';

// --- FUNCIONES DE CARGA DE DATOS ADAPTADAS (TSV) CON DEPURACIÓN ---
async function loadTSVData() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            console.error(`ERROR CRÍTICO: Falló la descarga de datos. Estado: ${response.status}. Verifica que el link de Google Sheets sea público.`);
            return [];
        }
        const tsvText = await response.text();
        return parseTSV(tsvText);
    } catch (error) {
        console.error('ERROR CRÍTICO: Error en la operación de fetch. Revisa el log:', error);
        return [];
    }
}

// Adaptación de parseCSV a TSV (tabulación)
function parseTSV(tsv) {
    const lines = tsv.trim().split(/\r?\n/);
    if (lines.length <= 1) return [];

    const headers = lines[0].split('\t').map(h => h.trim()); 
    const products = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split('\t').map(v => v.trim()); 
        
        if (values.length !== headers.length) continue;

        const product = {};
        headers.forEach((header, index) => {
            const rawValue = values[index];
            if (header === 'ID') {
                product[header] = rawValue;
            } else if (['Precio', 'Descuento', 'Precio Final'].includes(header.trim())) {
                let numValue = parseFloat(rawValue.replace('$', '').replace(/\./g, '').replace(',', '.'));
                product[header] = isNaN(numValue) ? 0 : numValue;
            } else {
                product[header] = rawValue;
            }
        });
        
        if (product.ID && product.Nombre) {
            products.push(product);
        }
    }
    return products;
}

// Group products by collection (FUNCIÓN ORIGINAL)
function groupProductsByCollection(products) {
    const collections = {};
    products.forEach(product => {
        const collectionName = product.Coleccion || 'Otros';
        if (!collections[collectionName]) {
            collections[collectionName] = [];
        }
        collections[collectionName].push(product);
    });
    return collections;
}

// Render navigation menu 
function renderNavigation() {
    const navMenu = document.getElementById('nav-menu');
    if (!navMenu) return; 
    navMenu.innerHTML = '';
    const collectionNames = Object.keys(collections);

    collectionNames.forEach((collectionName) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        const id = collectionName.replace(/\s+/g, '-');
        
        a.href = `#${id}`; 
        a.classList.add('nav-link');
        a.title = collectionName;
        
        a.style.backgroundImage = `url(imagenes_nav/${collectionName.replace(/\s+/g, '_')}.jpg)`;
        a.style.backgroundSize = 'cover';
        a.style.backgroundPosition = 'center';

        const label = document.createElement('span');
        label.textContent = collectionName;
        label.classList.add('collection-label');
        
        li.appendChild(a); 
        li.appendChild(label); 
        
        navMenu.appendChild(li);
    });
}

// Cambia la imagen visible en el carrusel (FUNCIÓN ORIGINAL)
function changeImage(productId, direction) {
    const carousel = document.getElementById(`carousel-${productId}`);
    if (!carousel) return;
    const images = Array.from(carousel.querySelectorAll('.carousel-image')).filter(img => img.classList.contains('loaded'));
    if (images.length < 2) return;
    let currentIndex = -1;
    images.forEach((img, index) => {
        if (img.style.display !== 'none') {
            currentIndex = index;
        }
    });
    if (currentIndex === -1) currentIndex = 0;
    let nextIndex = currentIndex + direction;
    if (nextIndex >= images.length) nextIndex = 0;
    else if (nextIndex < 0) nextIndex = images.length - 1;
    images[currentIndex].style.display = 'none';
    images[nextIndex].style.display = 'block';
}

// Render products 
async function renderProducts() {
    const catalogWrapper = document.getElementById('catalog-wrapper');
    if (!catalogWrapper) return;
    catalogWrapper.innerHTML = '';
    const collectionNames = Object.keys(collections);

    for (const collectionName of collectionNames) {
        const section = document.createElement('section');
        const id = collectionName.replace(/\s+/g, '-');
        section.id = id;
        section.className = 'collection-section';

        const title = document.createElement('h2');
        title.className = 'collection-title';
        title.textContent = collectionName;
        section.appendChild(title);
        const grid = document.createElement('div');
        grid.className = 'product-grid';

        for (const product of collections[collectionName]) {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';

            const imageContainer = document.createElement('div');
            imageContainer.className = 'product-image';
            imageContainer.id = `carousel-${product.ID}`;
            
            const maxImages = 3;
            const loadPromises = [];

            const loadImg = (ext, suffix) => {
                return new Promise((resolve) => {
                    const img = document.createElement('img');
                    img.src = `productos_img/${product.ID}${suffix}.${ext}`;
                    img.alt = `${product.Nombre} - Imagen ${suffix ? suffix.replace('_', ' ') : '1'}`;
                    img.className = 'carousel-image';
                    img.style.display = 'none';

                    img.onload = () => {
                        img.classList.add('loaded');
                        resolve(img);
                    };
                    img.onerror = () => {
                        resolve(null);
                    };
                });
            };

            for (let i = 0; i < maxImages; i++) {
                const suffix = i === 0 ? '' : `_${i}`;
                loadPromises.push(loadImg('jpg', suffix).then(img => img || loadImg('png', suffix)));
            }
            
            const results = await Promise.all(loadPromises);
            const loadedImages = results.filter(img => img !== null);

            loadedImages.forEach(img => imageContainer.appendChild(img));
            
            if (loadedImages.length > 0) {
                loadedImages[0].style.display = 'block';
            } else {
                imageContainer.textContent = product.Nombre;
                imageContainer.style.display = 'flex';
                imageContainer.style.alignItems = 'center';
                imageContainer.style.justifyContent = 'center';
                imageContainer.style.fontSize = '1rem';
                imageContainer.style.color = 'var(--primary-color)';
                imageContainer.style.fontWeight = '600';
            }

            if (loadedImages.length > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.className = 'carousel-btn prev-btn';
                prevBtn.innerHTML = '&#9664;';
                prevBtn.dataset.id = product.ID;
                prevBtn.onclick = () => changeImage(product.ID, -1);
                imageContainer.appendChild(prevBtn);
                const nextBtn = document.createElement('button');
                nextBtn.className = 'carousel-btn next-btn';
                nextBtn.innerHTML = '&#9654;';
                nextBtn.dataset.id = product.ID;
                nextBtn.onclick = () => changeImage(product.ID, 1);
                imageContainer.appendChild(nextBtn);
            }

            productCard.appendChild(imageContainer);
            
            const info = document.createElement('div');
            info.className = 'product-info';
            
            const titleEl = document.createElement('h3');
            titleEl.className = 'product-title';
            titleEl.textContent = product.Nombre;
            info.appendChild(titleEl);
            
            const brand = document.createElement('p');
            brand.className = 'product-codes'; 
            brand.innerHTML = `${product.Marca || 'N/A'}`;
            info.appendChild(brand);
            
            const price = document.createElement('p');
            price.className = 'product-price'; 
            
            const originalPriceValue = product.Precio || 0;
            const finalPriceValue = product['Precio Final'] || originalPriceValue;
            const hasDiscount = product.Descuento && product.Descuento > 0;
            
            if (hasDiscount) {
                price.innerHTML = `
                    <span class="product-price-original">$${originalPriceValue.toFixed(2)}</span>
                    <span class="product-price-final">$${finalPriceValue.toFixed(2)}</span>
                `;
            } else {
                price.innerHTML = `<span class="original-price">$${originalPriceValue.toFixed(2)}</span>`;
            }
            
            info.appendChild(price);
            
            const addToCart = document.createElement('button');
            // 🛑 CORRECCIÓN FINAL: Usamos la clase exacta que tu CSS requiere.
            addToCart.className = 'add-to-cart'; 
            addToCart.textContent = 'Añadir al Pedido';
            addToCart.dataset.id = product.ID;
            addToCart.onclick = () => addToCartHandler(product.ID); 
            info.appendChild(addToCart);
            
            productCard.appendChild(info);
            grid.appendChild(productCard);
        }
        section.appendChild(grid);
        catalogWrapper.appendChild(section);
    }
}

// --- RESTO DE LAS FUNCIONES ORIGINALES (SIN CAMBIOS) ---

function addToCartHandler(productId) {
    let product = null;
    for (const collection of Object.values(collections)) { 
        const found = collection.find(p => p.ID === productId);
        if (found) {
            product = found;
            break;
        }
    }

    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.ID,
            name: product.Nombre,
            price: product['Precio Final'] > 0 ? product['Precio Final'] : product.Precio,
            quantity: 1
        });
    }
    updateCart();
    showNotification(`${product.Nombre} añadido al pedido.`);
}

// --- FUNCIONES DE CARRITO (CORREGIDA) ---
function updateCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const totalAmount = document.getElementById('total-amount');
    if (!cartItemsContainer || !totalAmount) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart">
                <i>🛒</i>
                <p>Tu pedido está vacío</p>
                <p>Agrega productos para comenzar</p>
            </div>
        `;
        totalAmount.textContent = '0';
    } else {
        let cartHTML = '';
        let total = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            cartHTML += `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>
                        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    </div>
                    <div class="cart-item-quantity"> 
                        <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span> 
                        <button class="quantity-btn increase" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">Quitar</button>
                </div>
            `;
        });
        cartItemsContainer.innerHTML = cartHTML;
        totalAmount.textContent = total.toFixed(2);
    }
}

function decreaseQuantity(itemId) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            removeFromCart(itemId);
            return;
        }
        updateCart();
    }
}

function increaseQuantity(itemId) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.quantity += 1;
        updateCart();
    }
}

function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    updateCart();
}

function showNotification(message) { 
    const notification = document.createElement('div'); 
    notification.style.cssText = ` 
        position: fixed; top: 80px; right: 20px; 
        background-color: var(--primary-color); 
        color: white; padding: 12px 20px; border-radius: 10px; 
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2); 
        z-index: 9999; 
        transition: all 0.5s ease-out; 
    `; 
    notification.textContent = message; 
    document.body.appendChild(notification); 
    setTimeout(() => { 
        document.body.removeChild(notification); 
    }, 3000); 
}

function sendOrderViaWhatsApp() {
    if (cart.length === 0) {
        alert('El carrito está vacío.');
        return;
    }
    const nameInput = document.getElementById('customer-name');
    const messageInput = document.getElementById('customer-message');
    const totalAmountEl = document.getElementById('total-amount');

    const customerName = nameInput.value.trim();
    if (!customerName) {
        alert('Por favor, ingresa tu nombre para continuar el pedido.');
        nameInput.focus();
        return;
    }
    
    let message = `¡Hola! Soy *${customerName}* y quiero hacer el siguiente pedido:\n\n`;

    cart.forEach(item => {
        message += `${item.quantity} x ${item.name} - $${(item.quantity * item.price).toFixed(2)}\n`;
    });

    message += `\n*TOTAL: $${totalAmountEl.textContent}*\n`;
    
    if (messageInput.value.trim()) {
        message += `\n*Consulta/Comentario:*\n${messageInput.value.trim()}`;
    }

    message += `\n\nGracias.`;

    const whatsappNumber = '5493434287037'; 
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, '_blank');
    //Vaciamos y cerramos el modal
    resetCart();
}


function scrollToCollection(id) {
    const element = document.getElementById(id);
    if (element) {
        const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - FIXED_OFFSET;
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

// LÓGICA ORIGINAL DE CLASE ACTIVA (AJUSTADA A LA ESTRUCTURA LI > A + SPAN)
function updateActiveClass() {
    const sections = document.querySelectorAll('.collection-section');
    const navLinks = document.querySelectorAll('.nav-link');
    if (sections.length === 0) return;

    let activeIndex = sections.length - 1;
    for (let i = 0; i < sections.length; i++) {
        const rect = sections[i].getBoundingClientRect();
        if (rect.top >= FIXED_OFFSET) {
            activeIndex = i;
            break;
        }
    }

    navLinks.forEach(link => {
        link.classList.remove('active');
        link.parentElement.classList.remove('active');
        if (link.nextElementSibling) {
            link.nextElementSibling.classList.remove('active');
        }
    });

    const activeLink = navLinks[activeIndex];
    if (activeLink) {
        activeLink.classList.add('active');
        activeLink.parentElement.classList.add('active');
        if (activeLink.nextElementSibling) {
            activeLink.nextElementSibling.classList.add('active');
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const navMenu = document.getElementById('nav-menu');
    const scrollLeftBtn = document.getElementById('scroll-left');
    const scrollRightBtn = document.getElementById('scroll-right');
    const scrollDistance = 200; 

    if (scrollLeftBtn && scrollRightBtn && navMenu) { 
        scrollRightBtn.addEventListener('click', () => navMenu.scrollBy({ left: scrollDistance, behavior: 'smooth' }));
        scrollLeftBtn.addEventListener('click', () => navMenu.scrollBy({ left: -scrollDistance, behavior: 'smooth' }));
    }

    // Setup de Cart Modal
    const cartIcon = document.getElementById('cart-icon');
    const cartModal = document.getElementById('cart-modal');
    const closeBtn = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('checkout-btn');

    if (cartIcon) cartIcon.addEventListener('click', () => cartModal.style.display = 'block');
    if (closeBtn) closeBtn.addEventListener('click', () => cartModal.style.display = 'none');
    if (checkoutBtn) checkoutBtn.addEventListener('click', sendOrderViaWhatsApp);
    if (cartModal) cartModal.addEventListener('click', e => { if (e.target === cartModal) cartModal.style.display = 'none'; });
    
    // Setup de Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const nav = document.querySelector('nav'); 
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    // Evento de scroll para clase activa
    window.addEventListener('scroll', updateActiveClass);
    window.addEventListener('load', updateActiveClass);
    
    if (navMenu) {
        navMenu.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link')) {
                const href = e.target.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    scrollToCollection(href.substring(1));
                }
                setTimeout(updateActiveClass, 300);
            }
        });
    }

    // 🛑 LÓGICA AGREGADA: Activación de botones del carrito (Delegación de Eventos)
    // Esto es NECESARIO porque los botones se crean DENTRO de updateCart()
    const cartItemsContainer = document.getElementById('cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const target = e.target;
            const itemId = target.dataset.id;
            
            // Si el clic no fue en un botón con ID de producto, salir.
            if (!itemId) return; 

            if (target.classList.contains('decrease')) {
                decreaseQuantity(itemId);
            } else if (target.classList.contains('increase')) {
                increaseQuantity(itemId); // ¡Ahora sí llama a la función!
            } else if (target.classList.contains('remove-item')) {
                removeFromCart(itemId);
            }
        });
    }
}); // Cierre del primer DOMContentLoaded


// Initialize the app
document.addEventListener('DOMContentLoaded', async function() {
    products = await loadTSVData(); 
    collections = groupProductsByCollection(products);
    
    if (products.length > 0) {
        renderNavigation();
        renderProducts();
    } else {
        const catalogWrapper = document.getElementById('catalog-wrapper');
        if (catalogWrapper) {
             catalogWrapper.innerHTML = '<h2>Error al cargar el Catálogo</h2><p>Por favor, revisa la consola del navegador (F12) para ver los detalles del error en la carga de datos.</p>';
        }
    }
    updateCart();
});

function resetCart() {
    cart = []; 
    localStorage.removeItem('cart'); 
    updateCart(); 
    
    // Limpia los campos del formulario modal
    const customerName = document.getElementById('customer-name');
    const customerMessage = document.getElementById('customer-message');
    if (customerName) customerName.value = '';
    if (customerMessage) customerMessage.value = '';
    
    // Cierra el modal del carrito
    const cartModal = document.getElementById('cart-modal');
    if (cartModal) cartModal.style.display = 'none'; 
}
//ULTIMA LINEA PROBANDO QUE ACTUALICE EN GITHUB