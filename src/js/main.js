import { loadHeaderFooter } from "./utils.mjs";

function initializeMobileMenu() {
  // These elements might not exist immediately if loadHeaderFooter is async.
  // So, it's safer to attach event listeners after the header is guaranteed to be loaded.
  const hamburgerButton = document.querySelector(".hamburger");
  const closeMenuButton = document.querySelector(".close-menu");
  const mobileMenuOverlay = document.getElementById("mobile-menu-overlay");
  const mobileNavLinks = document.querySelectorAll(".mobile-nav ul li a"); // All links in the mobile menu

  if (hamburgerButton && mobileMenuOverlay && closeMenuButton) {
    hamburgerButton.addEventListener("click", () => {
      mobileMenuOverlay.classList.add("active");
      hamburgerButton.setAttribute("aria-expanded", "true");
    });

    closeMenuButton.addEventListener("click", () => {
      mobileMenuOverlay.classList.remove("active");
      hamburgerButton.setAttribute("aria-expanded", "false");
    });

    // Close menu when a link is clicked (for single-page navigation or general UX)
    mobileNavLinks.forEach((link) => {
      link.addEventListener("click", () => {
        mobileMenuOverlay.classList.remove("active");
        hamburgerButton.setAttribute("aria-expanded", "false");
      });
    });

    // Close menu if clicking outside the nav panel on the overlay itself
    mobileMenuOverlay.addEventListener("click", (event) => {
      if (event.target === mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove("active");
        hamburgerButton.setAttribute("aria-expanded", "false");
      }
    });
  } else {
    console.warn(
      "Mobile menu elements not found. Check if header is loaded correctly.",
    );
  }
}

await loadHeaderFooter();
initializeMobileMenu();
