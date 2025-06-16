import ExternalServices from "./ExternalServices.mjs";
import {
  getLocalStorage,
  setLocalStorage,
  renderListWithTemplate,
} from "./utils.mjs";

const THEMEALDB_SEARCH_URL = import.meta.env.VITE_THEMEALDB_SEARCH_URL;
const THEMEALDB_CATEGORY_LIST_URL = import.meta.env
  .VITE_THEMEALDB_CATEGORY_LIST_URL;
const THEMEALDB_AREA_LIST_URL = import.meta.env.VITE_THEMEALDB_AREA_LIST_URL;
const THEMEALDB_FILTER_CATEGORY_URL = import.meta.env
  .VITE_THEMEALDB_FILTER_URL_BASE;
const THEMEALDB_FILTER_AREA_URL = import.meta.env
  .VITE_THEMEALDB_FILTER_AREA_URL;
const PANTRY_STORAGE_KEY = import.meta.env.VITE_PANTRY_STORAGE_KEY;
const FAVORITES_STORAGE_KEY = import.meta.env.VITE_FAVORITES_STORAGE_KEY;

// --- Recipe Card Template ---
function recipeCardTemplate(recipe, pantryIngredientNames, isFavorite) {
  let totalIngredients = 0;
  let pantryMatches = 0;

  for (let i = 1; i <= 20; i++) {
    const ingredientKey = `strIngredient${i}`;
    const ingredientName = recipe[ingredientKey];

    if (ingredientName && ingredientName.trim() !== "") {
      totalIngredients++;
      if (pantryIngredientNames.has(ingredientName.trim().toLowerCase())) {
        pantryMatches++;
      }
    }
  }

  const ingredientCountText =
    totalIngredients > 0 ? `${pantryMatches}/${totalIngredients}` : "N/A";

  const favoriteButtonClass = isFavorite
    ? "favorite-button favorited"
    : "favorite-button";
  const favoriteIconClass = isFavorite ? "fas fa-heart" : "far fa-heart";

  return `
    <div class="card recipe-card" data-id="${recipe.idMeal}">
      <a href="/recipe_detail/index.html?id=${recipe.idMeal}" class="card-link-content">
        <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="card-image">
        <h3>${recipe.strMeal}</h3>
        <p class="recipe-ingredient-count">Ingredients: <span class="highlight-count">${ingredientCountText}</span></p>
      </a>
      <button class="${favoriteButtonClass}" data-id="${recipe.idMeal}" aria-label="Toggle favorite status">
        <i class="${favoriteIconClass}"></i>
      </button>
    </div>
  `;
}

// --- Empty/No Results Message Template ---
function renderNoResultsMessage(containerElement, message) {
  containerElement.innerHTML = `
    <div class="empty-message-container">
      <img src="/images/empty-pantry.png" alt="No Recipes Found Icon">
      <h2>${message}</h2>
      <p>Try a different search term or adjust your filters.</p>
    </div>
  `;
}

// --- RecipeSearchAndFilterManager Class ---
class RecipeSearchAndFilterManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.searchInput = document.querySelector("#search-input");
    this.searchButton = document.querySelector("#search-button");
    this.categoryFilter = document.querySelector("#category-filter");
    this.areaFilter = document.querySelector("#area-filter");
    this.recipeResultsContainer = document.querySelector(
      "#recipe-results-container",
    );
    this.pantryIngredientNames = new Set();
  }

  async init() {
    // Load pantry items once for potential future use (e.g., highlighting in results)
    const pantryItems = getLocalStorage(PANTRY_STORAGE_KEY) || [];
    this.pantryIngredientNames = new Set(
      pantryItems.map((item) => item.name.toLowerCase()),
    );

    // Populate filters
    await this.populateCategories();
    await this.populateAreas();

    // Attach event listeners
    this.attachEventListeners();

    // Load some initial recipes (e.g., popular or empty search)
    this.fetchAndRenderRecipes(THEMEALDB_SEARCH_URL);
  }

  attachEventListeners() {
    if (this.searchButton) {
      this.searchButton.addEventListener("click", () => this.handleSearch());
    }
    if (this.searchInput) {
      this.searchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.handleSearch();
        }
      });
    }
    if (this.categoryFilter) {
      this.categoryFilter.addEventListener("change", () => this.handleFilter());
    }
    if (this.areaFilter) {
      this.areaFilter.addEventListener("change", () => this.handleFilter());
    }
  }

  async populateCategories() {
    try {
      const data = await this.externalServices.get(THEMEALDB_CATEGORY_LIST_URL);
      if (data && data.meals) {
        data.meals.forEach((category) => {
          const option = document.createElement("option");
          option.value = category.strCategory;
          option.textContent = category.strCategory;
          this.categoryFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async populateAreas() {
    try {
      const data = await this.externalServices.get(THEMEALDB_AREA_LIST_URL);
      if (data && data.meals) {
        data.meals.forEach((area) => {
          const option = document.createElement("option");
          option.value = area.strArea;
          option.textContent = area.strArea;
          this.areaFilter.appendChild(option);
        });
      }
    } catch (error) {
      console.error("Error fetching areas:", error);
    }
  }

  handleSearch() {
    const searchTerm = this.searchInput.value.trim();
    this.categoryFilter.value = ""; // Clear filters when searching
    this.areaFilter.value = "";
    const url = `${THEMEALDB_SEARCH_URL}${encodeURIComponent(searchTerm)}`;
    this.fetchAndRenderRecipes(url);
  }

  handleFilter() {
    const selectedCategory = this.categoryFilter.value;
    const selectedArea = this.areaFilter.value;
    this.searchInput.value = ""; // Clear search when filtering

    let url;
    if (selectedCategory && selectedArea) {
      url = `${THEMEALDB_FILTER_CATEGORY_URL}${encodeURIComponent(selectedCategory)}`;
    } else if (selectedCategory) {
      url = `${THEMEALDB_FILTER_CATEGORY_URL}${encodeURIComponent(selectedCategory)}`;
    } else if (selectedArea) {
      url = `${THEMEALDB_FILTER_AREA_URL}${encodeURIComponent(selectedArea)}`;
    } else {
      url = THEMEALDB_SEARCH_URL;
    }
    this.fetchAndRenderRecipes(url);
  }

  async fetchAndRenderRecipes(url) {
    this.recipeResultsContainer.innerHTML =
      "<p class='loading-message'>Loading recipes...</p>";

    try {
      const data = await this.externalServices.get(url);
      const recipes = data && data.meals ? data.meals : [];
      const uniqueRecipes = new Map();

      recipes.forEach((recipe) => {
        uniqueRecipes.set(recipe.idMeal, recipe);
      });

      this.renderedRecipes = Array.from(uniqueRecipes.values());

      this.renderRecipes();
    } catch (error) {
      console.error("Error fetching recipes:", error);
      this.recipeResultsContainer.innerHTML = `
        <div class="empty-message-container">
          <img src="/images/empty-pantry.png" alt="Error Icon">
          <h2>Failed to load recipes.</h2>
          <p>Please check your internet connection or try again later.</p>
        </div>
      `;
    }
  }

  renderRecipes() {
    const currentFavorites = getLocalStorage(FAVORITES_STORAGE_KEY) || [];
    const favoriteIds = new Set(currentFavorites.map((fav) => fav));

    this.recipeResultsContainer.innerHTML = "";

    if (this.renderedRecipes.length === 0) {
      renderNoResultsMessage(
        this.recipeResultsContainer,
        "No recipes found. Try a different search or filter.",
      );
    } else {
      renderListWithTemplate(
        (recipe) =>
          recipeCardTemplate(
            recipe,
            this.pantryIngredientNames,
            favoriteIds.has(recipe.idMeal),
          ),
        this.recipeResultsContainer,
        this.renderedRecipes,
      );
    }

    this.addFavoriteButtonListeners();
  }

  addFavoriteButtonListeners() {
    this.recipeResultsContainer
      .querySelectorAll(".favorite-button")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          this.toggleFavorite(
            event.currentTarget.dataset.id,
            event.currentTarget,
          );
        });
      });
  }

  toggleFavorite(recipeId, buttonElement) {
    let favorites = getLocalStorage(FAVORITES_STORAGE_KEY) || [];
    const existingIndex = favorites.findIndex((fav) => {
      return fav === recipeId;
    });

    if (existingIndex > -1) {
      // Recipe is already a favorite, remove it
      favorites.splice(existingIndex, 1);
      buttonElement.classList.remove("favorited");
      buttonElement.querySelector("i").classList.replace("fas", "far");
    } else {
      // Recipe is not a favorite, add it
      favorites.push(recipeId);
      buttonElement.classList.add("favorited");
      buttonElement.querySelector("i").classList.replace("far", "fas");
    }

    setLocalStorage(FAVORITES_STORAGE_KEY, favorites);
    this.renderRecipes();
  }
}

// Initialize the manager
const recipeSearchManager = new RecipeSearchAndFilterManager();
recipeSearchManager.init();
