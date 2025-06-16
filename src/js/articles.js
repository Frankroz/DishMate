import ExternalServices from "./ExternalServices.mjs";
import { renderListWithTemplate } from "./utils.mjs";

const ARTICLES_JSON_URL = import.meta.env.VITE_ARTICLES_JSON_URL;

// --- Article Card Template ---
function articleCardTemplate(article) {
  return `
    <a href="/article_detail/index.html?id=${article.id}" class="card-link">
      <div class="card article-card">
        <img src="${article.imageUrl}" alt="${article.title}" class="card-image">
        <h3>${article.title}</h3>
        <p class="article-description">${article.description.substring(0, 100)}...</p>
        <div class="article-meta">
            <span><i class="fas fa-user-edit"></i> ${article.author}</span>
            <span><i class="far fa-calendar-alt"></i> ${new Date(article.publishDate).toLocaleDateString()}</span>
            <span><i class="far fa-clock"></i> ${article.readTime} Read</span>
        </div>
      </div>
    </a>
  `;
}

// --- Empty/No Results Message Template ---
function renderNoResultsMessage(containerElement, message) {
  containerElement.innerHTML = `
    <div class="empty-message-container">
      <img src="/images/empty-pantry.png" alt="No Articles Found Icon">
      <h2>${message}</h2>
      <p>Try a different search term, category, or sorting option.</p>
    </div>
  `;
}

// --- ArticleListingManager Class ---
class ArticleListingManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.searchInput = document.getElementById("article-search-input");
    this.searchButton = document.getElementById("article-search-button");
    this.categoryFilter = document.getElementById("category-filter");
    this.sortByDropdown = document.getElementById("sort-by");
    this.articleResultsContainer = document.getElementById(
      "article-results-container",
    );

    this.allArticles = [];
    this.filteredArticles = [];
  }

  async init() {
    await this.loadAllArticles();
    this.populateCategoryFilter();
    this.applyFiltersAndSort();

    this.attachEventListeners();
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
      this.categoryFilter.addEventListener("change", () =>
        this.applyFiltersAndSort(),
      );
    }
    if (this.sortByDropdown) {
      this.sortByDropdown.addEventListener("change", () =>
        this.applyFiltersAndSort(),
      );
    }
  }

  async loadAllArticles() {
    this.articleResultsContainer.innerHTML =
      "<p class='loading-message'>Loading articles...</p>";
    try {
      const data = await this.externalServices.get(ARTICLES_JSON_URL);
      if (Array.isArray(data)) {
        this.allArticles = data;
      } else if (data && Array.isArray(data.articles)) {
        this.allArticles = data.articles;
      } else {
        console.warn("Articles data is not in expected array format.", data);
        this.allArticles = [];
      }
    } catch (error) {
      console.error("Error fetching articles:", error);
      this.articleResultsContainer.innerHTML = `
        <div class="empty-message-container">
          <img src="/images/error-icon.png" alt="Error Icon">
          <h2>Failed to load articles.</h2>
          <p>Please check your internet connection or the JSON file path.</p>
        </div>
      `;
      this.allArticles = [];
    }
  }

  populateCategoryFilter() {
    const categories = new Set(
      this.allArticles.map((article) => article.category).filter(Boolean),
    );
    this.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      this.categoryFilter.appendChild(option);
    });
  }

  handleSearch() {
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort() {
    let currentArticles = [...this.allArticles];

    // 1. Apply Search Filter
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      currentArticles = currentArticles.filter(
        (article) =>
          (article.title && article.title.toLowerCase().includes(searchTerm)) ||
          (article.description &&
            article.description.toLowerCase().includes(searchTerm)),
      );
    }

    // 2. Apply Category Filter
    const selectedCategory = this.categoryFilter.value;
    if (selectedCategory) {
      currentArticles = currentArticles.filter(
        (article) =>
          article.category &&
          article.category.toLowerCase() === selectedCategory.toLowerCase(),
      );
    }

    // 3. Apply Sorting
    const sortBy = this.sortByDropdown.value;
    switch (sortBy) {
      case "date-desc":
        currentArticles.sort(
          (a, b) => new Date(b.publishDate) - new Date(a.publishDate),
        );
        break;
      case "date-asc":
        currentArticles.sort(
          (a, b) => new Date(a.publishDate) - new Date(b.publishDate),
        );
        break;
      case "title-asc":
        currentArticles.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "title-desc":
        currentArticles.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    this.filteredArticles = currentArticles;

    // 4. Render
    this.renderArticles(this.filteredArticles);
  }

  renderArticles(articlesToRender) {
    this.articleResultsContainer.innerHTML = "";
    if (articlesToRender.length === 0) {
      renderNoResultsMessage(
        this.articleResultsContainer,
        "No articles found.",
      );
    } else {
      renderListWithTemplate(
        articleCardTemplate,
        this.articleResultsContainer,
        articlesToRender,
      );
    }
  }
}

const articleListingManager = new ArticleListingManager();
articleListingManager.init();
