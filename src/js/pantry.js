import ExternalServices from "./ExternalServices.mjs";
import {
  getLocalStorage,
  setLocalStorage,
  renderListWithTemplate,
} from "./utils.mjs";

const pantry_storage_key = import.meta.env.VITE_PANTRY_STORAGE_KEY;
const ingredients_url = import.meta.env.VITE_THEMEALDB_INGREDIENTS_URL;

// --- Templates for Rendering ---
function myPantryCardTemplate(item) {
  return `
    <div class="card pantry-item-card">
      <h3>${item.name}</h3>
      <button class="remove-pantry-item" data-name="${item.name}" data-id="${item.id}">X</button>
    </div>
  `;
}

function renderEmptyPantryMessage() {
  const emptyMessageHtml = `
    <div class="empty-message-container">
      <img src="/images/empty-pantry.png" alt="Empty Pantry Icon"> <!-- Placeholder image -->
      <h2>Your pantry is empty!</h2>
      <p>Start adding ingredients to discover new recipes.</p>
    </div>
  `;
  const myPantryContainer = document.querySelector(".pantry-basket-grid");
  if (myPantryContainer) {
    myPantryContainer.innerHTML = emptyMessageHtml;
  }
}

function addIngredientCardTemplate(item) {
  return `
    <div class="card add-item-card">
      <h3>${item.strIngredient}</h3>
      <button class="add-button" data-name="${item.strIngredient}" data-id="${item.idIngredient}">+</button>
    </div>
  `;
}

// --- PantryManager Class ---

class PantryManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.myPantryListElement = document.querySelector(".pantry-basket-grid");
    this.addIngredientsListElement = document.querySelector(
      ".add-ingredients-grid",
    );
    this.searchInput = document.querySelector(".search-input");
    this.searchButton = document.querySelector(".search-button");
    this.allMealDbIngredients = []; // Store the full list for client-side filtering
  }

  async init() {
    this.renderMyPantry();

    await this.loadAndRenderAddIngredients();

    this.attachEventListeners();
  }

  renderMyPantry() {
    this.myPantryListElement.innerHTML = "";

    const pantryItems = getLocalStorage(pantry_storage_key) || [];
    if (pantryItems.length === 0) {
      renderEmptyPantryMessage();
    } else {
      renderListWithTemplate(
        myPantryCardTemplate,
        this.myPantryListElement,
        pantryItems,
      );
      // Re-attach listeners for remove buttons after rendering
      this.myPantryListElement
        .querySelectorAll(".remove-pantry-item")
        .forEach((button) => {
          button.addEventListener("click", (event) => {
            this.removePantryItem(event.target.dataset);
          });
        });
    }

    this.renderAddIngredients(this.filterIngredients());
  }

  async loadAndRenderAddIngredients() {
    try {
      // Fetch all ingredients from TheMealDB API
      const data = await this.externalServices.get(ingredients_url);
      if (data && data.meals) {
        this.allMealDbIngredients = data.meals;

        const ingredientsToAdd = this.filterIngredients();

        this.renderAddIngredients(ingredientsToAdd);
      } else {
        console.error("No meals data found from TheMealDB API.");
        this.addIngredientsListElement.innerHTML =
          "<p>Could not load ingredients. Please try again later.</p>";
      }
    } catch (error) {
      console.error("Failed to load ingredients from TheMealDB:", error);
      this.addIngredientsListElement.innerHTML =
        "<p>Failed to load ingredients. Check your internet connection.</p>";
    }
  }

  renderAddIngredients(list) {
    renderListWithTemplate(
      addIngredientCardTemplate,
      this.addIngredientsListElement,
      list,
    );
    // Attach listeners for add buttons after rendering
    this.addIngredientsListElement
      .querySelectorAll(".add-button")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          this.addIngredientToPantry(event.target.dataset);
        });
      });
  }

  attachEventListeners() {
    if (this.searchButton) {
      this.searchButton.addEventListener("click", () =>
        this.searchIngredients(),
      );
    }
    if (this.searchInput) {
      this.searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.searchIngredients();
        }
      });
    }
  }

  filterIngredients() {
    const pantryItems = getLocalStorage(pantry_storage_key) || [];
    const pantryIngredientIDs = new Set(pantryItems.map((item) => item.id));

    // Filter out ingredients already in the pantry
    const ingredientsToAdd = this.allMealDbIngredients.filter(
      (mealDbIngredient) => {
        return !pantryIngredientIDs.has(mealDbIngredient.idIngredient);
      },
    );

    return ingredientsToAdd;
  }

  searchIngredients() {
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm === "") {
      this.renderAddIngredients(this.filterIngredients()); // Show all if search cleared
    } else {
      const filteredIngredients = this.filterIngredients().filter((item) =>
        item.strIngredient.toLowerCase().includes(searchTerm),
      );
      this.renderAddIngredients(filteredIngredients);
    }
  }

  addIngredientToPantry(ingredient) {
    let pantryItems = getLocalStorage(pantry_storage_key) || [];
    const existingItemIndex = pantryItems.findIndex(
      (item) => item.id === ingredient.id,
    );

    if (existingItemIndex == -1) {
      pantryItems.push(ingredient);
    }

    setLocalStorage(pantry_storage_key, pantryItems);
    this.renderMyPantry();
  }

  removePantryItem(ingredient) {
    let pantryItems = getLocalStorage(pantry_storage_key) || [];
    // Filter out the item to remove
    pantryItems = pantryItems.filter((item) => item.id !== ingredient.id);
    setLocalStorage(pantry_storage_key, pantryItems);
    this.renderMyPantry();
  }
}

const pantryManager = new PantryManager();
pantryManager.init();
