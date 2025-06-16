import ExternalServices from "./ExternalServices.mjs";
import {
  getLocalStorage,
  setLocalStorage,
  renderListWithTemplate,
} from "./utils.mjs";

const FAVORITES_STORAGE_KEY = import.meta.env.VITE_FAVORITES_STORAGE_KEY;
const PANTRY_STORAGE_KEY = import.meta.env.VITE_PANTRY_STORAGE_KEY;
const THEMEALDB_LOOKUP_URL_BASE = import.meta.env
  .VITE_THEMEALDB_LOOKUP_URL_BASE;

// --- Saved Recipe Card Template ---
function savedRecipeCardTemplate(recipe) {
  const ingredientCountText =
    recipe.totalCount > 0
      ? `${recipe.pantryCount}/${recipe.totalCount}`
      : "N/A";

  return `
    <div class="card saved-recipe-card" data-id="${recipe.idMeal}">
      <a href="/recipe_detail/index.html?id=${recipe.idMeal}" class="card-link-content">
        <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="card-image">
        <h3>${recipe.strMeal}</h3>
        <p class="recipe-ingredient-count">Ingredients: <span class="highlight-count">${ingredientCountText}</span></p>
      </a>
      <button class="remove-favorite-btn" data-id="${recipe.idMeal}">
        <i class="fas fa-trash-alt"></i> Remove from Saved
      </button>
    </div>
  `;
}

// --- Empty Saved Recipes Message Template ---
function renderEmptySavedRecipesMessage(containerElement) {
  containerElement.innerHTML = `
    <div class="empty-message-container">
      <img src="/images/empty-pantry.png" alt="No Saved Recipes Icon">
      <h2>You haven't saved any recipes yet!</h2>
      <p>Start saving your favorite finds from the recipe search to see them here.</p>
      <div class="cart-card__button">
        <a href="/recipes/index.html" class="add-button">
          Find Recipes
        </a>
      </div>
    </div>
  `;
}

// --- SavedRecipesManager Class ---
class SavedRecipesManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.savedRecipesContainer = document.querySelector(
      "#saved-recipes-container",
    );
    this.pantryIngredientNames = new Set(); // To store pantry items for quick lookup
  }

  async init() {
    const pantryItems = getLocalStorage(PANTRY_STORAGE_KEY) || [];
    this.pantryIngredientNames = new Set(
      pantryItems.map((item) => item.name.toLowerCase()),
    );

    this.renderSavedRecipes();
  }

  async renderSavedRecipes() {
    const savedRecipeIds = getLocalStorage(FAVORITES_STORAGE_KEY) || [];

    if (savedRecipeIds.length === 0) {
      renderEmptySavedRecipesMessage(this.savedRecipesContainer);
      return;
    }

    this.savedRecipesContainer.innerHTML =
      "<p class='loading-message'>Loading your saved recipes...</p>";

    const lookupPromises = [];
    for (const savedRecipe of savedRecipeIds) {
      const url = `${THEMEALDB_LOOKUP_URL_BASE}${savedRecipe}`;
      lookupPromises.push(
        this.externalServices
          .get(url)
          .then((data) =>
            data && data.meals && data.meals[0] ? data.meals[0] : null,
          )
          .catch((error) => {
            console.warn(
              `Could not fetch details for saved recipe ID ${savedRecipe.idMeal}:`,
              error,
            );
            return null;
          }),
      );
    }

    const recipeResults = await Promise.allSettled(lookupPromises);
    const enrichedRecipes = [];

    recipeResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        const recipe = result.value;
        let totalIngredients = 0;
        let pantryMatches = 0;

        for (let i = 1; i <= 20; i++) {
          const ingredientName = recipe[`strIngredient${i}`];
          if (ingredientName && ingredientName.trim() !== "") {
            totalIngredients++;
            if (
              this.pantryIngredientNames.has(
                ingredientName.trim().toLowerCase(),
              )
            ) {
              pantryMatches++;
            }
          }
        }

        recipe.pantryCount = pantryMatches;
        recipe.totalCount = totalIngredients;
        enrichedRecipes.push(recipe);
      }
    });

    this.savedRecipesContainer.innerHTML = "";

    if (enrichedRecipes.length === 0) {
      renderEmptySavedRecipesMessage(this.savedRecipesContainer);
    } else {
      renderListWithTemplate(
        savedRecipeCardTemplate,
        this.savedRecipesContainer,
        enrichedRecipes,
      );
      this.attachRemoveButtonListeners();
    }
  }

  attachRemoveButtonListeners() {
    this.savedRecipesContainer
      .querySelectorAll(".remove-favorite-btn")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          const recipeId = event.currentTarget.dataset.id;
          this.removeFavoriteRecipe(recipeId);
        });
      });
  }

  removeFavoriteRecipe(recipeId) {
    let favorites = getLocalStorage(FAVORITES_STORAGE_KEY) || [];
    favorites = favorites.filter((fav) => fav !== recipeId);
    setLocalStorage(FAVORITES_STORAGE_KEY, favorites);
    this.renderSavedRecipes();
  }
}

const savedRecipesManager = new SavedRecipesManager();
savedRecipesManager.init();
