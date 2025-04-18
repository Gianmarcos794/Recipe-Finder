const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');


loginBtn.addEventListener('click', () => {
  loginForm.classList.add('active');
  signupForm.classList.remove('active');
  loginBtn.classList.add('active');
  signupBtn.classList.remove('active');
});

signupBtn.addEventListener('click', () => {
  signupForm.classList.add('active');
  loginForm.classList.remove('active');
  signupBtn.classList.add('active');
  loginBtn.classList.remove('active');
});


loginForm.addEventListener('submit', function (e) {
  e.preventDefault(); 

  const username = document.getElementById('username').value.trim();

  if (username) {
   
    localStorage.setItem('currentUser', username);

  
    window.location.href = 'index.html';
  } else {
    alert('Please enter a valid username.');
  }
});