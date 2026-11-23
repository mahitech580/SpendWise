const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const rootScript = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
const frontendScript = fs.readFileSync(path.join(__dirname, "../frontend/app.js"), "utf8");

function loadApp(storageValue) {
  const elements = new Map();
  const makeElement = () => ({
    value: "",
    textContent: "",
    innerHTML: "",
    timer: null,
    listeners: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    addEventListener(name, callback) {
      this.listeners[name] = callback;
    },
    reset() {},
  });
  const ids = [
    "month", "date", "income", "expense", "balance", "search",
    "list", "breakdown", "addTop", "close", "modal", "toast",
    "form", "name", "type", "category", "amount",
  ];
  for (const id of ids) elements.set(id, makeElement());

  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, makeElement());
        return elements.get(id);
      },
    },
    localStorage: {
      getItem() { return storageValue; },
      setItem() {},
    },
    console: { warn() {}, error() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
  });
  new vm.Script(rootScript, { filename: "spendwise-app.js" }).runInContext(context);
  return { context, elements };
}

test("both published frontends use the same validated application script", () => {
  assert.equal(rootScript, frontendScript);
  assert.doesNotThrow(() => new vm.Script(rootScript));
});

test("stored transactions are filtered for valid types, amounts, dates and unique IDs", () => {
  const { context } = loadApp("[]");
  const result = vm.runInContext(
    "sanitizeTransactions(" + JSON.stringify([
      { id: 1, name: "Salary", type: "income", category: "Work", amount: 10, date: "2026-11-19" },
      { id: 2, name: "Invalid type", type: "transfer", category: "Other", amount: 10, date: "2026-11-19" },
      { id: 3, name: "Invalid amount", type: "expense", category: "Food", amount: -1, date: "2026-11-19" },
      { id: 4, name: "Invalid date", type: "expense", category: "Food", amount: 1, date: "2026-02-30" },
      { id: 1, name: "Duplicate id", type: "expense", category: "Food", amount: 1, date: "2026-11-19" },
    ]) + ")",
    context,
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Salary");
});

test("user-controlled descriptions and categories are HTML escaped before rendering", () => {
  const stored = JSON.stringify([
    {
      id: 10,
      name: '<img src=x onerror="alert(1)">',
      type: "expense",
      category: '<svg onload="alert(2)">',
      amount: 10,
      date: "2026-11-19",
    },
  ]);
  const { elements } = loadApp(stored);

  assert.match(elements.get("list").innerHTML, /&lt;img/);
  assert.match(elements.get("list").innerHTML, /&lt;svg/);
  assert.doesNotMatch(elements.get("list").innerHTML, /<img|<svg/);
});


test("money formatting preserves decimal transaction amounts", () => {
  const { context } = loadApp("[]");

  assert.equal(vm.runInContext("money(1234.56)", context), "₹1,234.56");
  assert.equal(vm.runInContext("money(0.5)", context), "₹0.5");
});
