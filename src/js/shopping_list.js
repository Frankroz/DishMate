import {
  getLocalStorage,
  setLocalStorage,
  renderListWithTemplate,
} from "./utils.mjs";

const SHOPPING_LIST_STORAGE_KEY = import.meta.env
  .VITE_SHOPPING_LIST_STORAGE_KEY;
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// --- Shopping List Item Template ---
function shoppingListItemTemplate(item) {
  return `
    <li class="shopping-list-item">
      <div class="item-details">
        <span class="item-name">${item.name}</span>
      </div>
      <button class="remove-item-btn" data-name="${item.name}">
        <i class="fas fa-times-circle"></i> Remove
      </button>
    </li>
  `;
}

// --- Empty Shopping List Message Template ---
function renderEmptyShoppingListMessage(containerElement) {
  containerElement.innerHTML = `
    <div class="empty-message-container">
      <img src="${SERVER_URL}/images/empty-pantry.png" alt="Empty Shopping Cart Icon"> <!-- Placeholder image -->
      <h2>Your shopping list is empty!</h2>
      <p>Add ingredients from recipe details or your pantry to start planning.</p>
      <div class="cart-card__button">
        <a href="/recipes/index.html" class="add-button">
          Find Recipes
        </a>
      </div>
    </div>
  `;
}

// --- ShoppingListManager Class ---
class ShoppingListManager {
  constructor() {
    this.shoppingListContainer = document.querySelector(
      "#shopping-list-container",
    );
    this.clearListButton = document.querySelector("#clear-shopping-list");
  }

  async init() {
    this.renderShoppingList();
    this.attachEventListeners();
  }

  renderShoppingList() {
    const shoppingListItems = getLocalStorage(SHOPPING_LIST_STORAGE_KEY) || [];

    this.shoppingListContainer.innerHTML = "";
    if (shoppingListItems.length === 0) {
      renderEmptyShoppingListMessage(this.shoppingListContainer);
      if (this.clearListButton) {
        this.clearListButton.style.display = "none"; // Hide clear button if list is empty
      }
    } else {
      renderListWithTemplate(
        shoppingListItemTemplate,
        this.shoppingListContainer,
        shoppingListItems,
      );
      if (this.clearListButton) {
        this.clearListButton.style.display = "block"; // Show clear button
      }
      this.attachItemRemoveListeners(); // Attach listeners after items are rendered
    }
  }

  attachEventListeners() {
    if (this.clearListButton) {
      this.clearListButton.addEventListener("click", () =>
        this.clearAllShoppingItems(),
      );
    }
  }

  attachItemRemoveListeners() {
    this.shoppingListContainer
      .querySelectorAll(".remove-item-btn")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          const ingredientName = event.currentTarget.dataset.name;
          this.removeShoppingListItem(ingredientName);
        });
      });
  }

  removeShoppingListItem(ingredientName) {
    let shoppingList = getLocalStorage(SHOPPING_LIST_STORAGE_KEY) || [];

    shoppingList = shoppingList.filter(
      (item) => item.name.toLowerCase() !== ingredientName.toLowerCase(),
    );
    setLocalStorage(SHOPPING_LIST_STORAGE_KEY, shoppingList);
    this.renderShoppingList();
  }

  clearAllShoppingItems() {
    if (confirm("Are you sure you want to clear your entire shopping list?")) {
      setLocalStorage(SHOPPING_LIST_STORAGE_KEY, []);
      this.renderShoppingList();
    }
  }
}

// Initialize the manager when the script loads
const shoppingListManager = new ShoppingListManager();
shoppingListManager.init();
