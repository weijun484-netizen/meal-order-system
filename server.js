const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 中间件
app.use(bodyParser.json());
app.use(express.static('public'));

// 数据文件路径
const ordersFile = path.join(__dirname, 'data', 'orders.json');
const menuFile = path.join(__dirname, 'data', 'menu.json');
const dataDir = path.join(__dirname, 'data');

// 确保数据目录存在
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据文件
function initializeDataFiles() {
  if (!fs.existsSync(ordersFile)) {
    fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(menuFile)) {
    const defaultMenu = {
      "Monday": { "day": "周一", "dishes": ["红烧肉", "青菜", "豆腐汤"] },
      "Tuesday": { "day": "周二", "dishes": ["鸡蛋炒饭", "番茄鸡蛋", "冬瓜汤"] },
      "Wednesday": { "day": "周三", "dishes": ["清蒸鱼", "蒜蓉菜心", "萝卜排骨汤"] },
      "Thursday": { "day": "周四", "dishes": ["宫保鸡丁", "青豆玉米", "玉米汤"] },
      "Friday": { "day": "周五", "dishes": ["番茄牛肉面", "拌黄瓜", "紫菜汤"] }
    };
    fs.writeFileSync(menuFile, JSON.stringify(defaultMenu, null, 2));
  }
}

initializeDataFiles();

// 读取订单
function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
  } catch (e) {
    return [];
  }
}

// 保存订单
function saveOrders(orders) {
  fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
}

// 读取菜单
function readMenu() {
  try {
    return JSON.parse(fs.readFileSync(menuFile, 'utf8'));
  } catch (e) {
    return {};
  }
}

// 获取可订餐的日期（提前2天）
function getAvailableDates() {
  const dates = [];
  const today = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // 提前2天开始，可以订7天的餐
  for (let i = 2; i <= 9; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const dayName = daysOfWeek[date.getDay()];
    
    // 只能订工作日（周一到周五）
    if (dayName !== 'Saturday' && dayName !== 'Sunday') {
      dates.push({
        date: date.toISOString().split('T')[0],
        day: dayName,
        dayZh: getDayZh(dayName)
      });
    }
  }
  
  return dates;
}

function getDayZh(dayName) {
  const dayMap = {
    'Monday': '周一',
    'Tuesday': '周二',
    'Wednesday': '周三',
    'Thursday': '周四',
    'Friday': '周五'
  };
  return dayMap[dayName] || dayName;
}

// API 接口

// 获取可订餐日期
app.get('/api/available-dates', (req, res) => {
  res.json(getAvailableDates());
});

// 获取菜单
app.get('/api/menu/:date', (req, res) => {
  const menu = readMenu();
  const date = new Date(req.params.date);
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
  
  if (menu[dayName]) {
    res.json(menu[dayName]);
  } else {
    res.status(404).json({ error: '该日期无菜单' });
  }
});

// 提交订单
app.post('/api/orders', (req, res) => {
  const { name, date, selectedDishes } = req.body;
  
  if (!name || !date || !selectedDishes || selectedDishes.length !== 3) {
    return res.status(400).json({ error: '信息不完整或菜品数量不对' });
  }
  
  const orders = readOrders();
  const newOrder = {
    id: Date.now().toString(),
    name,
    date,
    selectedDishes,
    status: '待处理',
    createdAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  saveOrders(orders);
  
  res.json({ success: true, order: newOrder });
});

// 获取所有订单（后台）
app.get('/api/admin/orders', (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

// 更新订单状态
app.put('/api/admin/orders/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  
  const orders = readOrders();
  const order = orders.find(o => o.id === orderId);
  
  if (!order) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  order.status = status;
  saveOrders(orders);
  
  res.json({ success: true, order });
});

// 删除订单
app.delete('/api/admin/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const orders = readOrders();
  const index = orders.findIndex(o => o.id === orderId);
  
  if (index === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }
  
  orders.splice(index, 1);
  saveOrders(orders);
  
  res.json({ success: true });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 伙食订餐系统运行在 http://localhost:${PORT}`);
  console.log(`📝 员工下单: http://localhost:${PORT}/`);
  console.log(`📊 后台管理: http://localhost:${PORT}/admin.html`);
});
