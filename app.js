"use strict";

const STORAGE_KEY = "spendwise";
const $ = id => document.getElementById(id);

function isValidDate(value) {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isValidTransaction(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const id = Number(item.id);
  const amount = Number(item.amount);
  return Number.isSafeInteger(id) && id > 0 &&
    typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 120 &&
    typeof item.category === "string" && item.category.trim().length > 0 && item.category.length <= 40 &&
    (item.type === "income" || item.type === "expense") &&
    Number.isFinite(amount) && amount > 0 &&
    isValidDate(item.date);
}

function sanitizeTransactions(value) {
  if (!Array.isArray(value)) return [];
  const seenIds = new Set();
  return value
    .filter(isValidTransaction)
    .map(item => ({
      id: Number(item.id),
      name: item.name.trim(),
      type: item.type,
      category: item.category.trim(),
      amount: Number(item.amount),
      date: item.date
    }))
    .filter(item => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
}

function loadTransactions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return sanitizeTransactions(stored ? JSON.parse(stored) : []);
  } catch (error) {
    console.warn("SpendWise could not read saved transactions.", error);
    return [];
  }
}

let data = loadTransactions();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("SpendWise could not save transactions.", error);
    toast("Browser storage is unavailable. Your latest change may not persist.");
  }
  render();
}

function money(value) {
  const amount = Number(value);
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return "₹" + safeAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function render() {
  const income = data
    .filter(item => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = data
    .filter(item => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0);

  $("income").textContent = money(income);
  $("expense").textContent = money(expenses);
  $("balance").textContent = money(income - expenses);

  const query = $("search").value.trim().toLowerCase();
  const rows = data
    .filter(item => (item.name + " " + item.category).toLowerCase().includes(query))
    .sort((left, right) => right.date.localeCompare(left.date) || right.id - left.id);

  $("list").innerHTML = rows.length
    ? rows.map(item =>
        '<div class="tx">' +
          '<div><b>' + escapeHTML(item.name) + '</b>' +
          '<small>' + escapeHTML(item.category) + ' · ' + escapeHTML(item.date) + '</small></div>' +
          '<div class="amt ' + (item.type === "income" ? "plus" : "minus") + '">' +
          (item.type === "income" ? "+" : "−") + money(item.amount) +
          ' <button class="del" type="button" data-delete-id="' + item.id +
          '" aria-label="Delete ' + escapeHTML(item.name) + '">×</button></div>' +
        '</div>'
      ).join("")
    : '<div class="empty">No transactions found. Add your first one.</div>';

  const totalsByCategory = new Map();
  data.filter(item => item.type === "expense").forEach(item => {
    totalsByCategory.set(
      item.category,
      (totalsByCategory.get(item.category) || 0) + item.amount
    );
  });

  const total = Array.from(totalsByCategory.values()).reduce((sum, amount) => sum + amount, 0);
  const breakdown = Array.from(totalsByCategory.entries()).sort((a, b) => b[1] - a[1]);

  $("breakdown").innerHTML = total > 0
    ? breakdown.map(([category, amount]) => {
        const percentage = Math.max(0, Math.min(100, amount / total * 100));
        return '<div class="barrow"><div><span>' + escapeHTML(category) +
          '</span><b>' + money(amount) + '</b></div><div class="bar"><i style="width:' +
          percentage.toFixed(2) + '%"></i></div></div>';
      }).join("")
    : '<div class="empty">Your spending breakdown will appear here.</div>';
}

function nextTransactionId() {
  let id = Date.now();
  while (data.some(item => item.id === id)) id += 1;
  return id;
}

function removeTx(id) {
  data = data.filter(item => item.id !== Number(id));
  save();
  toast("Transaction deleted");
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2200);
}

$("month").textContent = new Date().toLocaleDateString("en-IN", {
  month: "long",
  year: "numeric"
});
$("date").value = new Date().toISOString().slice(0, 10);
$("addTop").addEventListener("click", () => $("modal").classList.add("show"));
$("close").addEventListener("click", () => $("modal").classList.remove("show"));
$("search").addEventListener("input", render);
$("list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-id]");
  if (button) removeTx(button.dataset.deleteId);
});

$("form").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("name").value.trim();
  const type = $("type").value;
  const category = $("category").value.trim();
  const amount = Number($("amount").value);
  const date = $("date").value;

  if (!name || name.length > 120 || !category || category.length > 40 ||
      (type !== "income" && type !== "expense") ||
      !Number.isFinite(amount) || amount <= 0 || !isValidDate(date)) {
    toast("Enter a valid description, category, amount and date.");
    return;
  }

  data.unshift({
    id: nextTransactionId(),
    name,
    type,
    category,
    amount,
    date
  });
  save();
  $("form").reset();
  $("date").value = new Date().toISOString().slice(0, 10);
  $("modal").classList.remove("show");
  toast("Transaction saved ✓");
});

render();
