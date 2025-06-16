import ExternalServices from "./ExternalServices.mjs";
import { getLocalStorage, setLocalStorage } from "./utils.mjs";

const PANTRY_STORAGE_KEY = "dm-pantry";
const FAVORITES_STORAGE_KEY = "dm-favorites";
const THEMEALDB_FILTER_URL_BASE =
  "https://www.themealdb.com/api/json/v1/1/filter.php?i=";
const THEMEALDB_LOOKUP_URL_BASE =
  "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";

// --- Recipe Card Template ---
function recipeCardTemplate(recipe, isFavorite = false) {
  const ingredientCountText =
    recipe.totalCount > 0
      ? `${recipe.pantryCount}/${recipe.totalCount}`
      : "N/A";

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

// --- Empty Pantry/No Recipes Message Template ---
function renderNoRecipesMessage(containerElement, message) {
  containerElement.innerHTML = `
    <div class="empty-message-container">
      <img src="/images/empty-pantry.png" alt="No Recipes Found Icon">
      <h2>${message}</h2>
      <p>Try adding more ingredients to your pantry or adjusting your selection.</p>
    </div>
  `;
}

// --- RecipeFinder Class ---
class RecipeFinder {
  constructor() {
    this.externalServices = new ExternalServices();
    this.recipesContainer = document.querySelector("#get-recipes");
  }

  async init() {
    const pantryItems = getLocalStorage(PANTRY_STORAGE_KEY) || [];
    const pantryIngredientNames = new Set(
      pantryItems.map((item) => item.name.toLowerCase()),
    );

    if (pantryItems.length === 0) {
      renderNoRecipesMessage(this.recipesContainer, "Your pantry is empty!");
      return;
    }

    const ingredientNames = pantryItems.map((item) => item.name);

    this.recipesContainer.innerHTML =
      "<p class='loading-message'>Finding and analyzing recipes based on your pantry...</p>";

    await this.fetchAndRenderRecipes(ingredientNames, pantryIngredientNames);
  }

  async fetchAndRenderRecipes(ingredients, pantryIngredientNames) {
    const uniqueBasicRecipes = new Map();
    const filterFetchPromises = [];

    for (const ingredient of ingredients) {
      const url = `${THEMEALDB_FILTER_URL_BASE}${encodeURIComponent(ingredient)}`;
      filterFetchPromises.push(
        this.externalServices
          .get(url)
          .then((data) => (data && data.meals ? data.meals : []))
          .catch((error) => {
            console.warn(`Could not fetch recipes for "${ingredient}":`, error);
            return [];
          }),
      );
    }

    const filterResults = await Promise.allSettled(filterFetchPromises);

    filterResults.forEach((result) => {
      if (result.status === "fulfilled") {
        result.value.forEach((recipe) => {
          uniqueBasicRecipes.set(recipe.idMeal, recipe);
        });
      }
    });

    if (uniqueBasicRecipes.size === 0) {
      renderNoRecipesMessage(
        this.recipesContainer,
        "No recipes found matching your pantry ingredients.",
      );
      return;
    }

    const fullRecipeFetchPromises = [];
    for (const [idMeal, basicRecipe] of uniqueBasicRecipes) {
      const lookupUrl = `${THEMEALDB_LOOKUP_URL_BASE}${idMeal}`;
      fullRecipeFetchPromises.push(
        this.externalServices
          .get(lookupUrl)
          .then((data) =>
            data && data.meals && data.meals[0] ? data.meals[0] : null,
          )
          .catch((error) => {
            console.warn(
              `Could not fetch full details for recipe ID ${idMeal}:`,
              error,
            );
            return null;
          }),
      );
    }

    const fullRecipeResults = await Promise.allSettled(fullRecipeFetchPromises);
    const enrichedRecipes = [];

    fullRecipeResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        const recipe = result.value;
        let totalIngredients = 0;
        let pantryMatches = 0;

        for (let i = 1; i <= 20; i++) {
          const ingredientKey = `strIngredient${i}`;
          const ingredientName = recipe[ingredientKey];

          if (ingredientName && ingredientName.trim() !== "") {
            totalIngredients++;
            if (
              pantryIngredientNames.has(ingredientName.trim().toLowerCase())
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

    this.renderedRecipes = enrichedRecipes;

    this.renderedRecipes.sort((a, b) => b.pantryCount - a.pantryCount);
    this.renderRecipes();
  }

  renderRecipes() {
    const currentFavorites = getLocalStorage(FAVORITES_STORAGE_KEY) || [];
    const favoriteIds = new Set(currentFavorites.map((fav) => fav));

    this.recipesContainer.innerHTML = "";
    this.renderedRecipes.forEach((recipe) => {
      const isFav = favoriteIds.has(recipe.idMeal);
      this.recipesContainer.insertAdjacentHTML(
        "beforeend",
        recipeCardTemplate(recipe, isFav),
      );
    });

    if (this.renderedRecipes.length === 0) {
      renderNoRecipesMessage(
        this.recipesContainer,
        "No recipes found matching your pantry ingredients.",
      );
    }

    this.addFavoriteButtonListeners()
  }

  addFavoriteButtonListeners() {
    this.recipesContainer
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

// Initialize the RecipeFinder when the script loads
const recipeFinder = new RecipeFinder();
recipeFinder.init();
