import ExternalServices from "./ExternalServices.mjs";
import { getLocalStorage, setLocalStorage, getParam } from "./utils.mjs";

const PANTRY_STORAGE_KEY = import.meta.env.VITE_PANTRY_STORAGE_KEY;
const SHOPPING_LIST_STORAGE_KEY = import.meta.env
  .VITE_SHOPPING_LIST_STORAGE_KEY;
const THEMEALDB_LOOKUP_URL_BASE = import.meta.env
  .VITE_THEMEALDB_LOOKUP_URL_BASE;
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// --- Recipe Detail Rendering ---
function renderRecipeDetail(
  recipe,
  pantryIngredientNames,
  shoppingListIngredientNames,
) {
  if (!recipe) {
    return `
      <div class="empty-message-container">
        <img src="${SERVER_URL}/images/empty-pantry.png" alt="Recipe Not Found Icon">
        <h2>Recipe not found!</h2>
        <p>It seems this recipe ID is invalid or the recipe does not exist.</p>
      </div>
    `;
  }

  let totalIngredients = 0;
  let pantryMatches = 0;
  const ingredientsListHtml = [];

  // Iterate through ingredients and measures
  for (let i = 1; i <= 20; i++) {
    const ingredientName = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];

    if (ingredientName && ingredientName.trim() !== "") {
      totalIngredients++;
      const isPantryItem = pantryIngredientNames.has(
        ingredientName.trim().toLowerCase(),
      );
      const isShoppingListItem = shoppingListIngredientNames.has(
        ingredientName.trim().toLowerCase(),
      );

      const ingredientClass = isPantryItem ? "in-pantry" : "not-in-pantry";
      const buttonText = isShoppingListItem
        ? "Remove from Shopping List"
        : "Add to Shopping List";
      const buttonClass = isShoppingListItem
        ? "shopping-list-btn remove"
        : "shopping-list-btn add";
      const buttonIcon = isShoppingListItem
        ? "fas fa-minus-circle"
        : "fas fa-plus-circle";

      ingredientsListHtml.push(`
        <li class="ingredient-item ${ingredientClass}">
          <span>${measure} ${ingredientName}</span>
          ${
            !isPantryItem
              ? `<button class="${buttonClass}" data-ingredient-name="${ingredientName}" data-is-added="${isShoppingListItem}">
            <i class="${buttonIcon}"></i> ${buttonText}
          </button>`
              : '<span class="pantry-checkmark"><i class="fas fa-check-circle"></i> In Pantry</span>'
          }
        </li>
      `);

      if (isPantryItem) {
        pantryMatches++;
      }
    }
  }

  const ingredientCountText =
    totalIngredients > 0 ? `${pantryMatches}/${totalIngredients}` : "N/A";

  // Generate YouTube embed URL
  const youtubeEmbedUrl = recipe.strYoutube
    ? recipe.strYoutube.replace("watch?v=", "embed/")
    : null;
  const youtubeHtml = youtubeEmbedUrl
    ? `
    <div class="recipe-video">
      <h4>Recipe Video Guide</h4>
      <iframe src="${youtubeEmbedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  `
    : "";

  return `
    <div class="recipe-header">
        <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="recipe-image">
        <div class="recipe-info">
            <h1>${recipe.strMeal}</h1>
            <p><strong>Category:</strong> ${recipe.strCategory}</p>
            <p><strong>Area:</strong> ${recipe.strArea}</p>
            <p><strong>Ingredients in Pantry:</strong> <span class="highlight-count">${ingredientCountText}</span></p>
            ${recipe.strSource ? `<p><strong>Source:</strong> <a href="${recipe.strSource}" target="_blank" rel="noopener noreferrer">View Original Recipe</a></p>` : ""}
        </div>
    </div>
    
    <div class="recipe-details-body">
        <div class="ingredients-section">
            <h3>Ingredients Needed</h3>
            <ul class="ingredients-list">
                ${ingredientsListHtml.join("")}
            </ul>
        </div>
        <div class="instructions-section">
            <h3>Instructions</h3>
            <p>${recipe.strInstructions}</p>
        </div>
    </div>
    ${youtubeHtml}
  `;
}

// --- RecipeDetailManager Class ---
class RecipeDetailManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.recipeDetailsContainer = document.querySelector(
      "#recipe-details-container",
    );
  }

  async init() {
    const recipeId = getParam("id");

    if (!recipeId) {
      this.recipeDetailsContainer.innerHTML = renderRecipeDetail(null);
      return;
    }

    this.recipeDetailsContainer.innerHTML =
      "<p class='loading-message'>Fetching recipe details...</p>";

    const pantryItems = getLocalStorage(PANTRY_STORAGE_KEY) || [];
    const pantryIngredientNames = new Set(
      pantryItems.map((item) => item.name.toLowerCase()),
    );

    const shoppingListItems = getLocalStorage(SHOPPING_LIST_STORAGE_KEY) || [];
    const shoppingListIngredientNames = new Set(
      shoppingListItems.map((item) => item.name.toLowerCase()),
    );

    try {
      const data = await this.externalServices.get(
        `${THEMEALDB_LOOKUP_URL_BASE}${recipeId}`,
      );
      const recipe = data && data.meals && data.meals[0] ? data.meals[0] : null;

      this.recipeDetailsContainer.innerHTML = renderRecipeDetail(
        recipe,
        pantryIngredientNames,
        shoppingListIngredientNames,
      );

      this.attachShoppingListListeners();
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      document.querySelector(".recipe-title").textContent =
        "Error Loading Recipe";
      this.recipeDetailsContainer.innerHTML = `
        <div class="empty-message-container">
          <img src="/images/error-icon.png" alt="Error Icon"> <!-- Placeholder for error image -->
          <h2>Failed to load recipe details.</h2>
          <p>Please check your internet connection or try again later.</p>
        </div>
      `;
    }
  }

  attachShoppingListListeners() {
    this.recipeDetailsContainer
      .querySelectorAll(".shopping-list-btn")
      .forEach((button) => {
        button.addEventListener("click", (event) => {
          const ingredientName = event.currentTarget.dataset.ingredientName;
          const isAdded = event.currentTarget.dataset.isAdded === "true"; // Convert string to boolean
          this.toggleShoppingListItem(
            ingredientName,
            isAdded,
            event.currentTarget,
          );
        });
      });
  }

  toggleShoppingListItem(ingredientName, isCurrentlyInList, buttonElement) {
    let shoppingList = getLocalStorage(SHOPPING_LIST_STORAGE_KEY) || [];
    const lowerCaseIngredient = ingredientName.toLowerCase();
    const existingIndex = shoppingList.findIndex(
      (item) => item.name.toLowerCase() === lowerCaseIngredient,
    );

    if (isCurrentlyInList && existingIndex > -1) {
      // Remove from list
      shoppingList.splice(existingIndex, 1);
      // Update button text/class
      this.updateShoppingListButton(buttonElement, false);
    } else if (!isCurrentlyInList) {
      // Add to list (only if not already there, though UI should prevent this)
      if (existingIndex === -1) {
        // Double check to prevent adding if somehow already present
        shoppingList.push({ name: ingredientName });
        // Update button text/class
        this.updateShoppingListButton(buttonElement, true);
      }
    }
    setLocalStorage(SHOPPING_LIST_STORAGE_KEY, shoppingList);
  }

  updateShoppingListButton(buttonElement, isAdded) {
    if (isAdded) {
      buttonElement.classList.replace("add", "remove");
      buttonElement.dataset.isAdded = "true";
      buttonElement.innerHTML =
        '<i class="fas fa-minus-circle"></i> Remove from Shopping List';
    } else {
      buttonElement.classList.replace("remove", "add");
      buttonElement.dataset.isAdded = "false";
      buttonElement.innerHTML =
        '<i class="fas fa-plus-circle"></i> Add to Shopping List';
    }
  }
}

// Initialize the manager
const recipeDetailManager = new RecipeDetailManager();
recipeDetailManager.init();
