// 全局变量
let currentDishes = [];
let selectedDishes = new Set();
let allOrders = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadAvailableDates();
  loadUserOrders();
  
  document.getElementById('date').addEventListener('change', loadMenu);
  document.getElementById('submitBtn').addEventListener('click', submitOrder);
  document.getElementById('name').addEventListener('input', checkFormValidity);
});

// 加载可订餐日期
async function loadAvailableDates() {
  try {
    const response = await fetch('/api/available-dates');
    const dates = await response.json();
    
    const dateSelect = document.getElementById('date');
    dates.forEach(d => {
      const option = document.createElement('option');
      option.value = d.date;
      option.textContent = `${d.dayZh} (${d.date})`;
      dateSelect.appendChild(option);
    });
  } catch (error) {
    console.error('加载日期失败:', error);
  }
}

// 加载菜单
async function loadMenu() {
  const date = document.getElementById('date').value;
  if (!date) {
    document.getElementById('dishes').innerHTML = '';
    selectedDishes.clear();
    updateSelectedDisplay();
    return;
  }
  
  try {
    const response = await fetch(`/api/menu/${date}`);
    const menuData = await response.json();
    
    currentDishes = menuData.dishes || [];
    selectedDishes.clear();
    renderDishes();
    updateSelectedDisplay();
  } catch (error) {
    console.error('加载菜单失败:', error);
    document.getElementById('dishes').innerHTML = '<p class="empty-message">加载菜单失败</p>';
  }
}

// 渲染菜品
function renderDishes() {
  const dishesContainer = document.getElementById('dishes');
  dishesContainer.innerHTML = '';
  
  currentDishes.forEach((dish, index) => {
    const dishItem = document.createElement('div');
    dishItem.className = 'dish-item';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `dish-${index}`;
    input.value = dish;
    input.addEventListener('change', (e) => handleDishChange(e, dish));
    
    const label = document.createElement('label');
    label.htmlFor = `dish-${index}`;
    label.textContent = dish;
    
    dishItem.appendChild(input);
    dishItem.appendChild(label);
    dishesContainer.appendChild(dishItem);
  });
}

// 处理菜品选择
function handleDishChange(e, dish) {
  if (e.target.checked) {
    if (selectedDishes.size >= 3) {
      e.target.checked = false;
      alert('最多只能选择3样菜品！');
      return;
    }
    selectedDishes.add(dish);
  } else {
    selectedDishes.delete(dish);
  }
  
  updateSelectedDisplay();
  checkFormValidity();
}

// 更新已选菜品显示
function updateSelectedDisplay() {
  const selectedContainer = document.getElementById('selectedDishes');
  
  if (selectedDishes.size === 0) {
    selectedContainer.innerHTML = '<p class="empty-message">还没有选择菜品</p>';
  } else {
    selectedContainer.innerHTML = Array.from(selectedDishes)
      .map(dish => `
        <div class="dish-tag">
          ${dish}
          <span class="remove" onclick="removeDish('${dish}')">✕</span>
        </div>
      `).join('');
  }
}

// 移除菜品
function removeDish(dish) {
  selectedDishes.delete(dish);
  
  // 更新复选框状态
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    if (cb.value === dish) {
      cb.checked = false;
    }
  });
  
  updateSelectedDisplay();
  checkFormValidity();
}

// 检查表单有效性
function checkFormValidity() {
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value;
  const submitBtn = document.getElementById('submitBtn');
  
  if (name && date && selectedDishes.size === 3) {
    submitBtn.disabled = false;
  } else {
    submitBtn.disabled = true;
  }
}

// 提交订单
async function submitOrder() {
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value;
  
  if (!name || !date || selectedDishes.size !== 3) {
    alert('请完整填写订单信息！');
    return;
  }
  
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        date,
        selectedDishes: Array.from(selectedDishes)
      })
    });
    
    if (response.ok) {
      alert('✅ 订单提交成功！');
      document.getElementById('name').value = '';
      document.getElementById('date').value = '';
      selectedDishes.clear();
      renderDishes();
      updateSelectedDisplay();
      checkFormValidity();
      loadUserOrders();
    } else {
      alert('❌ 订单提交失败，请重试！');
    }
  } catch (error) {
    console.error('提交订单失败:', error);
    alert('❌ 提交失败，请检查网络连接！');
  }
}

// 加载用户订单
async function loadUserOrders() {
  try {
    const response = await fetch('/api/admin/orders');
    allOrders = await response.json();
    
    const name = document.getElementById('name').value.trim();
    const userOrders = name ? allOrders.filter(o => o.name === name) : [];
    
    const historyContainer = document.getElementById('orderHistory');
    
    if (userOrders.length === 0) {
      historyContainer.innerHTML = '<p class="empty-message">暂无订单</p>';
    } else {
      historyContainer.innerHTML = userOrders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(order => `
          <div class="order-item">
            <div class="order-item-header">
              <span class="order-item-date">📅 ${order.date}</span>
              <span class="order-item-status ${order.status === '待处理' ? 'status-pending' : 'status-completed'}">${order.status}</span>
            </div>
            <div class="order-item-dishes">
              <strong>🥘 菜品:</strong> ${order.selectedDishes.join(' + ')}
            </div>
          </div>
        `).join('');
    }
  } catch (error) {
    console.error('加载订单失败:', error);
  }
}

// 监听名字变化时重新加载订单
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('name').addEventListener('change', loadUserOrders);
});
