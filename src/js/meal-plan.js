import ExternalServices from "./ExternalServices.mjs";
import {
  getLocalStorage,
  setLocalStorage,
  renderListWithTemplate,
} from "./utils.mjs";

const FAVORITES_STORAGE_KEY = "dm-favorites";
const MEAL_PLAN_STORAGE_KEY = "dm-meal-plan";
const THEMEALDB_LOOKUP_URL_BASE =
  "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";

// Template for a meal card displayed for a selected date
function plannedMealCardTemplate(meal) {
  return `
    <div class="card planned-meal-card" data-id="${meal.idMeal}">
      <img src="${meal.strMealThumb}" alt="${meal.strMeal}" class="card-image">
      <h3>${meal.strMeal}</h3>
      <button class="remove-planned-meal-btn" data-id="${meal.idMeal}">X</button>
    </div>
  `;
}

// Template for a favorite recipe card to be added to meal plan
function favoriteMealCardTemplate(recipe) {
  return `
    <div class="card saved-recipe-card favorite-meal" data-id="${recipe.idMeal}">
      <a href="/recipe_detail/index.html?id=${recipe.idMeal}" class="card-link-content">
        <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="card-image">
        <h3>${recipe.strMeal}</h3>
      </a>
        <button class="get-recipes-btn add-meal-to-plan-btn" data-id="${recipe.idMeal}" data-name="${recipe.strMeal}">add</button>
    </div>
  `;
}

// --- Empty Message Helpers ---
function renderEmptyMessage(containerElement, message, type = "default") {
  let html = "";
  if (type === "small") {
    html = `<p class="empty-message-small">${message}</p>`;
  } else {
    html = `
      <div class="empty-message-container">
        <img src="/images/empty-placeholder.png" alt="Empty Icon">
        <h2>${message}</h2>
        <p>No items to display.</p>
      </div>
    `;
  }
  containerElement.innerHTML = html;
}

// --- Error Message Display ---
function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  }
}

function hideError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.style.display = "none";
  }
}

// --- MealPlanManager Class ---
class MealPlanManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.datePicker = document.getElementById("meal-date-picker");
    this.selectedDateHeading = document.getElementById("selected-date-heading");
    this.mealsForDateContainer = document.getElementById(
      "meals-for-date-container",
    );
    this.favoriteSearchInput = document.getElementById("favorite-search-input");
    this.favoriteSearchButton = document.getElementById(
      "favorite-search-button",
    );
    this.favoritesForPlanningContainer = document.getElementById(
      "favorites-for-planning-container",
    );

    this.selectedDate = null;
    this.allFavoriteRecipes = []; // Store full favorite recipe objects
  }

  async init() {
    flatpickr(this.datePicker, {
      dateFormat: "Y-m-d",
      defaultDate: new Date(),
      onChange: (selectedDates, dateStr) => {
        this.selectedDate = dateStr;
        this.updateSelectedDateDisplay();
        this.renderMealsForSelectedDate();
        hideError("date-selection-error");
      },
    });

    // Manually trigger change for default date on load
    if (this.datePicker._flatpickr.selectedDates[0]) {
      this.selectedDate = flatpickr.formatDate(
        this.datePicker._flatpickr.selectedDates[0],
        "Y-m-d",
      );
      this.updateSelectedDateDisplay();
    }

    await this.loadAndRenderFavoriteRecipes();
    this.renderMealsForSelectedDate();

    this.attachEventListeners();
  }

  attachEventListeners() {
    if (this.favoriteSearchButton) {
      this.favoriteSearchButton.addEventListener("click", () =>
        this.searchFavoriteRecipes(),
      );
    }
    if (this.favoriteSearchInput) {
      this.favoriteSearchInput.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
          this.searchFavoriteRecipes();
        }
      });
    }

    // Event delegation for Add/Remove buttons on the dynamically loaded cards
    this.favoritesForPlanningContainer.addEventListener("click", (event) => {
      if (
        event.target.classList.contains("add-meal-to-plan-btn") ||
        event.target.closest(".add-meal-to-plan-btn")
      ) {
        const button = event.target.closest(".add-meal-to-plan-btn");
        const recipeId = button.dataset.id;
        const recipeName = button.dataset.name;
        this.addMealToPlan(recipeId, recipeName);
      }
    });

    this.mealsForDateContainer.addEventListener("click", (event) => {
      if (
        event.target.classList.contains("remove-planned-meal-btn") ||
        event.target.closest(".remove-planned-meal-btn")
      ) {
        const button = event.target.closest(".remove-planned-meal-btn");
        const recipeId = button.dataset.id;
        this.removeMealFromPlan(recipeId);
      }
    });
  }

  updateSelectedDateDisplay() {
    if (this.selectedDate) {
      const displayDate = new Date(this.selectedDate).toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        },
      );
      this.selectedDateHeading.textContent = `Meal(s) for ${displayDate}`;
    } else {
      this.selectedDateHeading.textContent = "Meal(s) for {Date Not Selected}";
    }
  }

  async loadAndRenderFavoriteRecipes() {
    const favoriteIds = getLocalStorage(FAVORITES_STORAGE_KEY) || [];

    if (favoriteIds.length === 0) {
      renderEmptyMessage(
        this.favoritesForPlanningContainer,
        "You haven't saved any recipes yet!",
        "default",
      );
      showError(
        "favorites-error",
        "You have no favorite recipes. Add some to plan meals!",
      );
      return;
    } else {
      hideError("favorites-error");
    }

    this.favoritesForPlanningContainer.innerHTML =
      "<p class='loading-message'>Loading your saved recipes...</p>";

    const lookupPromises = [];
    for (const fav of favoriteIds) {
      const url = `${THEMEALDB_LOOKUP_URL_BASE}${fav}`;
      lookupPromises.push(
        this.externalServices
          .get(url)
          .then((data) =>
            data && data.meals && data.meals[0] ? data.meals[0] : null,
          )
          .catch((error) => {
            console.warn(
              `Could not fetch details for favorite recipe ID ${fav}:`,
              error,
            );
            return null;
          }),
      );
    }

    const results = await Promise.allSettled(lookupPromises);
    this.allFavoriteRecipes = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);

    this.favoritesForPlanningContainer.innerHTML = "";

    if (this.allFavoriteRecipes.length === 0) {
      renderEmptyMessage(
        this.favoritesForPlanningContainer,
        "No favorite recipes found.",
        "default",
      );
      showError(
        "favorites-error",
        "Failed to load favorite recipes. Check console for errors.",
      );
    } else {
      this.renderFavoriteRecipes(this.allFavoriteRecipes);
    }
  }

  renderFavoriteRecipes(recipes) {
    if (recipes.length === 0) {
      renderEmptyMessage(
        this.favoritesForPlanningContainer,
        "No matching saved recipes found.",
        "default",
      );
    } else {
      renderListWithTemplate(
        favoriteMealCardTemplate,
        this.favoritesForPlanningContainer,
        recipes,
      );
    }
  }

  searchFavoriteRecipes() {
    const searchTerm = this.favoriteSearchInput.value.toLowerCase().trim();
    if (searchTerm === "") {
      this.renderFavoriteRecipes(this.allFavoriteRecipes);
    } else {
      const filtered = this.allFavoriteRecipes.filter((recipe) =>
        recipe.strMeal.toLowerCase().includes(searchTerm),
      );
      this.renderFavoriteRecipes(filtered);
    }
  }

  renderMealsForSelectedDate() {
    this.mealsForDateContainer.innerHTML = "";
    if (!this.selectedDate) {
      this.mealsForDateContainer.innerHTML =
        "<p class='empty-message-small'>Please select a date to view planned meals.</p>";
      return;
    }

    const mealPlan = getLocalStorage(MEAL_PLAN_STORAGE_KEY) || {};
    const mealsForDate = mealPlan[this.selectedDate] || [];
    if (mealsForDate.length === 0) {
      renderEmptyMessage(
        this.mealsForDateContainer,
        "No meals planned for this date.",
        "small",
      );
    } else {
      // Fetch full details for planned meals to display them correctly
      const plannedMealPromises = mealsForDate.map((mealId) =>
        this.externalServices
          .get(`${THEMEALDB_LOOKUP_URL_BASE}${mealId}`)
          .then((data) =>
            data && data.meals && data.meals[0] ? data.meals[0] : null,
          )
          .catch((error) => {
            console.warn(
              `Could not fetch details for planned meal ID ${mealId}:`,
              error,
            );
            return null;
          }),
      );

      this.mealsForDateContainer.innerHTML = ""
      
      Promise.allSettled(plannedMealPromises).then((results) => {
        const fullMeals = results
          .filter((r) => r.status === "fulfilled" && r.value)
          .map((r) => r.value);
        if (fullMeals.length === 0) {
          renderEmptyMessage(
            this.mealsForDateContainer,
            "No meals planned for this date.",
            "small",
          );
        } else {
          renderListWithTemplate(
            plannedMealCardTemplate,
            this.mealsForDateContainer,
            fullMeals,
          );
        }
      });
    }
  }

  addMealToPlan(recipeId, recipeName) {
    if (!this.selectedDate) {
      showError(
        "date-selection-error",
        "Please select a date before adding a meal.",
      );
      return;
    }
    hideError("date-selection-error");

    let mealPlan = getLocalStorage(MEAL_PLAN_STORAGE_KEY) || {};
    if (!mealPlan[this.selectedDate]) {
      mealPlan[this.selectedDate] = [];
    }

    // Check for duplicates for the selected date
    if (mealPlan[this.selectedDate].includes(recipeId)) {
      return;
    }

    mealPlan[this.selectedDate].push(recipeId);
    setLocalStorage(MEAL_PLAN_STORAGE_KEY, mealPlan);
    this.renderMealsForSelectedDate();
  }

  removeMealFromPlan(recipeId) {
    if (!this.selectedDate) {
      showError(
        "date-selection-error",
        "No date selected to remove meal from.",
      );
      return;
    }

    let mealPlan = getLocalStorage(MEAL_PLAN_STORAGE_KEY) || {};
    if (mealPlan[this.selectedDate]) {
      mealPlan[this.selectedDate] = mealPlan[this.selectedDate].filter(
        (id) => id !== recipeId,
      );
      if (mealPlan[this.selectedDate].length === 0) {
        delete mealPlan[this.selectedDate];
      }
      setLocalStorage(MEAL_PLAN_STORAGE_KEY, mealPlan);
      this.renderMealsForSelectedDate();
    }
  }
}

// Initialize the manager when the script loads
const mealPlanManager = new MealPlanManager();
mealPlanManager.init();
