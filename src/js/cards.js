import ExternalServices from "./ExternalServices.mjs";
import CardList from "./CardList.mjs";

const recipesService = new ExternalServices("recipes");
const latestRecipesContainer = document.getElementById("latest-recipes");
const recipesCardList = new CardList("recipes", recipesService, latestRecipesContainer, true);
recipesCardList.init();

const articlesService = new ExternalServices("articles");
const latestArticlesContainer = document.getElementById("latest-articles");
const articlesCardList = new CardList("articles", articlesService, latestArticlesContainer, true);
articlesCardList.init();