
// Simple tab switching only
const navItems = document.querySelectorAll(".nav-item");
const tabs = document.querySelectorAll(".tab-content");

function showTab(tabId) {
  tabs.forEach(t => t.classList.toggle("active", t.id === tabId));
  navItems.forEach(n => n.classList.toggle("active", n.dataset.tab === tabId));
}

navItems.forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    showTab(item.dataset.tab);
  });
});
