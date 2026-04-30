// Dark/Light theme toggle
const themeToggle = document.createElement('button');
themeToggle.innerHTML = '🌙';
themeToggle.className = 'theme-toggle fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg cursor-pointer';

// Check saved preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    themeToggle.innerHTML = '☀️';
}

themeToggle.onclick = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.innerHTML = isDark ? '☀️' : '🌙';
};

document.body.appendChild(themeToggle);