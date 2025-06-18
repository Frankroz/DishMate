import ExternalServices from "./ExternalServices.mjs";
import { getParam } from "./utils.mjs";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// --- Article Detail Rendering ---
function formatArticleContent(text) {
  if (!text) return "";

  // 1. Replace **text** or *text* with <strong>text</strong>
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formattedText = formattedText.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // 2. Replace \n (newline characters) with <br> tags for line breaks in HTML
  formattedText = formattedText.replace(/\n/g, "<br>");

  return formattedText;
}

function renderArticleDetail(article) {
  if (!article) {
    return `
      <div class="empty-message-container">
        <img src="${SERVER_URL}/images/empty-pantry.png" alt="Article Not Found Icon"> <h2>Article not found!</h2>
        <p>It seems this article ID is invalid or the article does not exist.</p>
      </div>
    `;
  }

  // Fallback for longerDescription if it's missing
  const rawMainContent =
    article.longerDescription || "No detailed content available.";

  // Format the main content to handle newlines and bolding
  const formattedMainContent = formatArticleContent(rawMainContent);

  return `
    <div class="article-header">
        <img src="${SERVER_URL}${article.imageUrl}" alt="${article.title}" class="article-image">
        <div class="article-meta-info">
            <h1>${article.title}</h1>
            <p><strong>Author:</strong> ${article.author}</p>
            <p><strong>Published:</strong> ${new Date(article.publishDate).toLocaleDateString()}</p>
            <p><strong>Read Time:</strong> ${article.readTime}</p>
            ${article.category ? `<p><strong>Category:</strong> ${article.category}</p>` : ""}
        </div>
    </div>
    
    <div class="article-content">
        <p>${formattedMainContent}</p>
    </div>
    
  `;
}

// --- ArticleDetailManager Class ---
class ArticleDetailManager {
  constructor() {
    this.externalServices = new ExternalServices();
    this.articleDetailContainer = document.getElementById(
      "article-detail-container",
    );
  }

  async init() {
    const articleId = getParam("id");

    if (isNaN(articleId)) {
      document.querySelector(".article-detail-title").textContent =
        "Invalid Article ID";
      this.articleDetailContainer.innerHTML = renderArticleDetail(null);
      return;
    }

    this.articleDetailContainer.innerHTML =
      "<div class='loader'></div>";

    try {
      // Fetch all articles
      const article = await this.externalServices.get(
        `${SERVER_URL}/articles/${articleId}`,
      );

      document.querySelector(".article-detail-title").textContent = article
        ? article.title
        : "Article Not Found";
      this.articleDetailContainer.innerHTML = renderArticleDetail(article);
    } catch (error) {
      console.error("Error fetching article details:", error);
      document.querySelector(".article-detail-title").textContent =
        "Error Loading Article";
      this.articleDetailContainer.innerHTML = `
        <div class="empty-message-container">
          <img src="${SERVER_URL}/images/empty-pantry.png" alt="Error Icon">
          <h2>Failed to load article details.</h2>
          <p>Please check your internet connection or the JSON file.</p>
        </div>
      `;
    }
  }
}

const articleDetailManager = new ArticleDetailManager();
articleDetailManager.init();
