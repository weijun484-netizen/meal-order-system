// 全局变量
let allOrders = [];
let currentFilter = 'all';
let filteredOrders = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadOrders();
  
  // 设置自动刷新（每30秒）
  setInterval(loadOrders, 30000);
  
  // 绑定事件
  document.getElementById('refreshBtn').addEventListener('click', loadOrders);
  document.getElementById('filterDate').addEventListener('change', applyFilters);
  
  // 绑定导航菜单
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      currentFilter = item.dataset.filter;
      applyFilters();
    });
  });
});

// 加载订单
async function loadOrders() {
  try {
    const response = await fetch('/api/admin/orders');
    allOrders = await response.json();
    applyFilters();
  } catch (error) {
    console.error('加载订单失败:', error);
    document.getElementById('ordersList').innerHTML = '<p class="empty-message">加载失败，请刷新页面重试</p>';
  }
}

// 应用筛选
function applyFilters() {
  let filtered = [...allOrders];
  
  // 按状态筛选
  if (currentFilter === 'pending') {
    filtered = filtered.filter(o => o.status === '待处理');
  } else if (currentFilter === 'completed') {
    filtered = filtered.filter(o => o.status === '已完成');
  }
  
  // 按日期筛选
  const filterDate = document.getElementById('filterDate').value;
  if (filterDate) {
    filtered = filtered.filter(o => o.date === filterDate);
  }
  
  filteredOrders = filtered;
  updateStats();
  renderOrders();
}

// 更新统计数据
function updateStats() {
  const total = allOrders.length;
  const pending = allOrders.filter(o => o.status === '待处理').length;
  const completed = allOrders.filter(o => o.status === '已完成').length;
  
  document.getElementById('totalOrders').textContent = total;
  document.getElementById('pendingOrders').textContent = pending;
  document.getElementById('completedOrders').textContent = completed;
}

// 渲染订单列表
function renderOrders() {
  const ordersList = document.getElementById('ordersList');
  
  // 排序：按日期倒序
  const sorted = filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  if (sorted.length === 0) {
    ordersList.innerHTML = '<p class="empty-message">暂无订单</p>';
    return;
  }
  
  let html = '<div class="order-row-header">
    <div>📅 订餐日期</div>
    <div>👤 员工名字 / 🥘 菜品</div>
    <div>📌 状态</div>
    <div>⏰ 下单时间</div>
    <div>⚙️ 操作</div>
  </div>';
  
  sorted.forEach(order => {
    const createdAt = new Date(order.createdAt);
    const timeStr = createdAt.toLocaleTimeString('zh-CN');
    const dateStr = createdAt.toLocaleDateString('zh-CN');
    const fullTime = `${dateStr} ${timeStr}`;
    
    html += `
      <div class="order-row">
        <div class="order-date">📅 ${order.date}</div>
        <div>
          <div class="order-name">${order.name}</div>
          <div class="order-dishes">🥘 ${order.selectedDishes.join(' + ')}</div>
        </div>
        <div>
          <span class="order-status ${order.status === '待处理' ? 'status-pending' : 'status-completed'}">
            ${order.status}
          </span>
        </div>
        <div>${fullTime}</div>
        <div class="order-actions">
          ${order.status === '待处理' ? `
            <button class="btn-action btn-complete" onclick="completeOrder('${order.id}')">✅ 完成</button>
          ` : ''}
          <button class="btn-action btn-delete" onclick="deleteOrder('${order.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  });
  
  ordersList.innerHTML = html;
}

// 标记订单为完成
async function completeOrder(orderId) {
  if (!confirm('确认标记此订单为已完成吗？')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: '已完成' })
    });
    
    if (response.ok) {
      loadOrders();
    } else {
      alert('更新失败，请重试');
    }
  } catch (error) {
    console.error('更新订单失败:', error);
    alert('更新失败');
  }
}

// 删除订单
async function deleteOrder(orderId) {
  if (!confirm('确认删除此订单吗？')) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      loadOrders();
    } else {
      alert('删除失败，请重试');
    }
  } catch (error) {
    console.error('删除订单失败:', error);
    alert('删除失败');
  }
}
