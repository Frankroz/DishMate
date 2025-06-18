import { renderListWithTemplate } from "./utils.mjs";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

function recipeCardTemplate(recipe) {
  return `<a href="/recipe_detail/index.html?id=${recipe.idMeal}" class="card-link">
            <div class="card">
                <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="card-image">
                <h3>${recipe.strMeal}</h3>
                <p>${recipe.description}</p>
                <div class="card-meta">
                    <span><i class="far fa-clock"></i> Prep: ${recipe.prepTime}</span>
                    <span><i class="fas fa-hourglass-half"></i> Cook: ${recipe.cookTime}</span>
                </div>
            </div>
          </a>`;
}

function articleCardTemplate(article) {
  return `<a href="/article_detail/index.html?id=${article.id}" class="card-link">
            <div class="card">
                <img src="${SERVER_URL}${article.imageUrl}" alt="${article.title}" class="card-image">
                <h3>${article.title}</h3>
                <p>${article.description}</p>
                <div class="card-meta">
                    <span>Read Time: ${article.readTime}</span>
                    <span>Date: ${article.publishDate}</span>
                </div>
            </div>
          </a>`;
}

export default class CardList {
  constructor(category, dataSource, listElement, latest = false) {
    this.category = category;
    this.dataSource = dataSource;
    this.listElement = listElement;
    this.latest = latest;
  }

  async init() {
    const list = await this.dataSource.get(`${SERVER_URL}/${this.category}`);

    if (this.latest) {
      this.renderList(list.slice(0, 3));
      return;
    }

    this.renderList(list);
  }

  renderList(list) {
    if (this.category == "recipes")
      renderListWithTemplate(recipeCardTemplate, this.listElement, list);
    else if (this.category == "articles")
      renderListWithTemplate(articleCardTemplate, this.listElement, list);
  }
}
