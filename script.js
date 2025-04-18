const API_KEY = '1';
const BASE_URL = 'https://www.themealdb.com/api/json/v1';

const recipeCarousel = document.getElementById('recipeCarousel');
const carouselNav = document.getElementById('carouselNav');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const searchInput = document.querySelector('.search-input');
const searchBtn = document.querySelector('.search-btn');
const recipeModal = document.getElementById('recipeModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');
const saveRecipeBtn = document.getElementById('saveRecipeBtn');
const saveBtnText = document.getElementById('saveBtnText');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.querySelector('.menu-toggle');
const sidebarClose = document.getElementById('sidebarClose');
const savedRecipesList = document.getElementById('savedRecipesList');
const userAvatar = document.getElementById('userAvatar');
const categorySelect = document.getElementById('categorySelect');

let currentRecipes = [];
let currentIndex = 0;
let cardsPerView = 3;
let currentUser = {
  id: 1,
  name: 'User',
  savedRecipes: []
};
let currentRecipeInModal = null;
let categories = [];

document.addEventListener('DOMContentLoaded', function () {
  const currentUser = localStorage.getItem('currentUser');

  if (!currentUser) {
    window.location.href = 'login.html';
  } else {
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
      userAvatar.textContent = currentUser[0].toUpperCase();
    }
  }
});

document.getElementById('logoutButton').addEventListener('click', function () {
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
});

function init() {
  loadUserData();
  fetchCategories();
  fetchMealsOfTheDay();
  setupEventListeners();
  updateCardsPerView();
  renderSavedRecipes();
}

function loadUserData() {
  const savedUser = localStorage.getItem('recipeFinderUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
  }
}

function saveUserData() {
  localStorage.setItem('recipeFinderUser', JSON.stringify(currentUser));
  renderSavedRecipes();
}

function fetchCategories() {
  fetch(`${BASE_URL}/${API_KEY}/categories.php`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.categories) {
        categories = data.categories;
        populateCategoryDropdown(categories);
      }
    })
    .catch(error => {
      console.error('Error fetching categories:', error);
    });
}

function populateCategoryDropdown(categories) {
  categorySelect.innerHTML = '<option value="">All Categories</option>';

  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.strCategory;
    option.textContent = category.strCategory;
    categorySelect.appendChild(option);
  });
}

function setupEventListeners() {
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  categorySelect.addEventListener('change', function () {
    if (this.value) {
      handleSearch();
    }
  });

  modalClose.addEventListener('click', closeModal);
  recipeModal.addEventListener('click', function (e) {
    if (e.target === recipeModal) {
      closeModal();
    }
  });

  saveRecipeBtn.addEventListener('click', toggleSaveRecipe);

  carouselPrev.addEventListener('click', scrollToPrev);
  carouselNext.addEventListener('click', scrollToNext);

  menuToggle.addEventListener('click', () => {
    sidebar.classList.add('open');
  });

  sidebarClose.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  userAvatar.addEventListener('click', toggleSidebar);

  window.addEventListener('resize', function () {
    updateCardsPerView();
    updateCarouselControls();
  });

  recipeCarousel.addEventListener('scroll', updateCarouselControls);
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
}

function updateCardsPerView() {
  if (window.innerWidth < 768) {
    cardsPerView = 1;
  } else if (window.innerWidth < 1024) {
    cardsPerView = 2;
  } else {
    cardsPerView = 3;
  }
  updateCarouselControls();
}

function fetchMealsOfTheDay() {
  showLoading();

  const mealPromises = [];
  for (let i = 0; i < 20; i++) {
    mealPromises.push(
      fetch(`${BASE_URL}/${API_KEY}/random.php`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => data.meals[0])
        .catch(() => null)
    );
  }

  Promise.all(mealPromises)
    .then(meals => {
      currentRecipes = meals.filter(meal => meal !== null);
      renderRecipes(currentRecipes);
      updateCarouselControls();
    })
    .catch(error => {
      console.error('Error fetching random meals:', error);
      showError();
    });
}

function handleSearch() {
  const query = searchInput.value.trim();
  const category = categorySelect.value;

  showLoading();

  if (category && !query) {
    fetchRecipesByCategory(category);
  } else {
    const url = `${BASE_URL}/${API_KEY}/search.php?s=${encodeURIComponent(query)}`;

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        if (data.meals) {
          if (category) {
            currentRecipes = data.meals.filter(meal => meal.strCategory === category);
          } else {
            currentRecipes = data.meals;
          }

          if (currentRecipes.length === 0) {
            showNoResults();
          } else {
            renderRecipes(currentRecipes);
            updateCarouselControls();
          }
        } else {
          showNoResults();
        }
      })
      .catch(error => {
        console.error('Error searching recipes:', error);
        showError();
      });
  }
}

function fetchRecipesByCategory(category) {
  const url = `${BASE_URL}/${API_KEY}/filter.php?c=${encodeURIComponent(category)}`;
  const recipesHeading = document.getElementById("recipesHeading");

  recipesHeading.textContent = `${category} Recipes`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.meals && data.meals.length > 0) {
        const recipesToShow = data.meals.slice(0, 20);

        const recipePromises = recipesToShow.map(recipe => 
          fetch(`${BASE_URL}/${API_KEY}/lookup.php?i=${recipe.idMeal}`)
            .then(response => {
              if (!response.ok) {
                throw new Error('Network response was not ok');
              }
              return response.json();
            })
            .then(data => data.meals[0])
            .catch(error => {
              console.error(`Error fetching details for recipe ${recipe.idMeal}:`, error);
              return null;
            })
        );

        Promise.all(recipePromises)
          .then(detailedRecipes => {
            currentRecipes = detailedRecipes.filter(recipe => recipe !== null);
            
            if (currentRecipes.length === 0) {
              showNoResults();
            } else {
              renderRecipes(currentRecipes);
              updateCarouselControls();
            }
          })
          .catch(error => {
            console.error('Error fetching detailed recipes:', error);
            showError();
          });
      } else {
        showNoResults();
      }
    })
    .catch(error => {
      console.error('Error fetching category recipes:', error);
      showError();
    });
}

function renderRecipes(recipes) {
  if (!recipes || recipes.length === 0) {
    showNoResults();
    return;
  }

  recipeCarousel.innerHTML = '';
  carouselNav.innerHTML = '';

  recipes.forEach((recipe, index) => {
    const recipeCard = createRecipeCard(recipe);
    recipeCarousel.appendChild(recipeCard);
  });

  const dotCount = Math.ceil(recipes.length / cardsPerView);
  for (let i = 0; i < dotCount; i++) {
    const dot = document.createElement('div');
    dot.classList.add('carousel-dot');
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => scrollToIndex(i));
    carouselNav.appendChild(dot);
  }
}

function createRecipeCard(recipe) {
  const card = document.createElement('div');
  card.classList.add('recipe-card');

  const mediaContainer = document.createElement('div');
  mediaContainer.classList.add('recipe-media-container');

  const image = document.createElement('img');
  image.classList.add('recipe-image');
  image.src = recipe.strMealThumb || 'https://via.placeholder.com/300x200?text=No+Image';
  image.alt = recipe.strMeal;
  image.onerror = function () {
    this.src = 'https://via.placeholder.com/300x200?text=No+Image';
  };

  let videoElement = null;
  if (recipe.strYoutube) {
    const videoId = extractYouTubeId(recipe.strYoutube);
    if (videoId) {
      videoElement = document.createElement('iframe');
      videoElement.classList.add('recipe-video');
      videoElement.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&enablejsapi=1`;
      videoElement.setAttribute('frameborder', '0');
      videoElement.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      videoElement.setAttribute('allowfullscreen', '');
    }
  }

  mediaContainer.appendChild(image);
  if (videoElement) mediaContainer.appendChild(videoElement);

  const content = document.createElement('div');
  content.classList.add('recipe-content');

  const title = document.createElement('h3');
  title.classList.add('recipe-title');
  title.textContent = recipe.strMeal;

  const category = document.createElement('span');
  category.classList.add('recipe-category');
  category.textContent = recipe.strCategory || 'Unknown';

  const meta = document.createElement('div');
  meta.classList.add('recipe-meta');

  const area = document.createElement('span');
  area.textContent = recipe.strArea || 'Unknown';

  content.appendChild(title);
  content.appendChild(category);
  content.appendChild(meta);

  meta.appendChild(area);

  const viewBtn = document.createElement('a');
  viewBtn.classList.add('view-btn');
  viewBtn.href = '#';
  viewBtn.textContent = 'View Recipe →';
  viewBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showRecipeDetails(recipe.idMeal);
  });

  content.appendChild(viewBtn);

  card.appendChild(mediaContainer);
  card.appendChild(content);

  return card;
}

function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function scrollToIndex(index) {
  const scrollAmount = index * (300 + 20);
  recipeCarousel.scrollTo({
    left: scrollAmount,
    behavior: 'smooth'
  });

  updateActiveDot();

  currentIndex = index;
  updateCarouselControls();
}

function scrollToPrev() {
  if (currentIndex > 0) {
    scrollToIndex(currentIndex - 1);
  }
}

function scrollToNext() {
  if (currentIndex < Math.ceil(currentRecipes.length / cardsPerView) - 1) {
    scrollToIndex(currentIndex + 1);
  }
}

function updateActiveDot() {
  const dots = document.querySelectorAll('.carousel-dot');
  const scrollPosition = recipeCarousel.scrollLeft;
  const cardWidth = 300 + 20;
  const currentIndex = Math.round(scrollPosition / cardWidth);

  dots.forEach((dot, index) => {
    if (index === currentIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

function updateCarouselControls() {
  const scrollPosition = recipeCarousel.scrollLeft;
  const cardWidth = 300 + 20;
  const maxScroll = recipeCarousel.scrollWidth - recipeCarousel.clientWidth;

  carouselPrev.disabled = scrollPosition <= 0;
  carouselNext.disabled = scrollPosition >= maxScroll - 10;
}

function showRecipeDetails(recipeId) {
  showLoadingModal();

  const url = `${BASE_URL}/${API_KEY}/lookup.php?i=${recipeId}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.meals && data.meals.length > 0) {
        currentRecipeInModal = data.meals[0];
        renderRecipeDetails(currentRecipeInModal);
        updateSaveButtonState();
      } else {
        showErrorModal('Recipe not found');
      }
    })
    .catch(error => {
      console.error('Error fetching recipe details:', error);
      showErrorModal('Failed to load recipe details');
    });
}

function toggleSaveRecipe() {
  if (!currentRecipeInModal) return;

  const recipeId = currentRecipeInModal.idMeal;
  const recipeIndex = currentUser.savedRecipes.findIndex(r => r.idMeal === recipeId);

  if (recipeIndex === -1) {
    currentUser.savedRecipes.push({
      idMeal: currentRecipeInModal.idMeal,
      strMeal: currentRecipeInModal.strMeal,
      strMealThumb: currentRecipeInModal.strMealThumb,
      strCategory: currentRecipeInModal.strCategory
    });
    saveBtnText.textContent = 'Saved';
    saveRecipeBtn.classList.add('saved');
  } else {
    currentUser.savedRecipes.splice(recipeIndex, 1);
    saveBtnText.textContent = 'Save Recipe';
    saveRecipeBtn.classList.remove('saved');
  }

  saveUserData();
}

function updateSaveButtonState() {
  if (!currentRecipeInModal) return;

  const isSaved = currentUser.savedRecipes.some(r => r.idMeal === currentRecipeInModal.idMeal);

  if (isSaved) {
    saveBtnText.textContent = 'Saved';
    saveRecipeBtn.classList.add('saved');
  } else {
    saveBtnText.textContent = 'Save Recipe';
    saveRecipeBtn.classList.remove('saved');
  }
}

function renderRecipeDetails(recipe) {
  modalTitle.textContent = recipe.strMeal;

  let modalContent = `
    <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}" class="modal-image">
    
    <div class="modal-section">
      <h4 class="modal-section-title">About</h4>
      <div class="recipe-meta">
        <span><strong>Category:</strong> ${recipe.strCategory || 'Unknown'}</span>
        <span><strong>Cuisine:</strong> ${recipe.strArea || 'Unknown'}</span>
      </div>
    </div>
    
    <div class="modal-section">
      <h4 class="modal-section-title">Ingredients</h4>
      <ul class="ingredients-list">
  `;

  for (let i = 1; i <= 20; i++) {
    const ingredient = recipe[`strIngredient${i}`];
    const measure = recipe[`strMeasure${i}`];

    if (ingredient && ingredient.trim() !== '') {
      modalContent += `<li>${measure || ''} ${ingredient}</li>`;
    }
  }

  modalContent += `
      </ul>
    </div>
    
    <div class="modal-section">
      <h4 class="modal-section-title">Instructions</h4>
      <div class="instructions">${recipe.strInstructions || 'No instructions provided.'}</div>
    </div>
    
    ${recipe.strYoutube ? `
    <div class="modal-section">
      <h4 class="modal-section-title">Video Tutorial</h4>
      <p><a href="${recipe.strYoutube}" target="_blank">Watch on YouTube</a></p>
    </div>
    ` : ''}
  `;

  modalBody.innerHTML = modalContent;
  recipeModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function renderSavedRecipes() {
  savedRecipesList.innerHTML = '';

  if (currentUser.savedRecipes.length === 0) {
    savedRecipesList.innerHTML = '<li style="padding: 20px; text-align: center; color: var(--light-text);">No saved recipes yet</li>';
    return;
  }

  currentUser.savedRecipes.forEach(recipe => {
    const li = document.createElement('li');
    li.className = 'saved-recipe';

    li.innerHTML = `
      <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
      <span class="saved-recipe-title">${recipe.strMeal}</span>
    `;

    li.addEventListener('click', () => {
      showRecipeDetails(recipe.idMeal);
      toggleSidebar();
    });

    savedRecipesList.appendChild(li);
  });
}

function showLoadingModal() {
  modalBody.innerHTML = '<div class="loading">Loading recipe details...</div>';
  recipeModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function showErrorModal(message) {
  modalBody.innerHTML = `<div class="loading">${message}</div>`;
  recipeModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  recipeModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  currentRecipeInModal = null;
}

function showLoading() {
  recipeCarousel.innerHTML = '<div class="loading">Loading recipes...</div>';
  carouselNav.innerHTML = '';
}

function showError() {
  recipeCarousel.innerHTML = '<div class="loading">Failed to load recipes. Please try again later.</div>';
  carouselNav.innerHTML = '';
}

function showNoResults() {
  recipeCarousel.innerHTML = '<div class="loading">No recipes found. Try a different search.</div>';
  carouselNav.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', init);