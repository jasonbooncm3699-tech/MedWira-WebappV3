// Clear localStorage data to fix the timestamp issue
if (typeof window !== 'undefined') {
  localStorage.removeItem('recentChats');
  localStorage.removeItem('tokens');
  localStorage.removeItem('loggedIn');
  localStorage.removeItem('darkMode');
  localStorage.removeItem('language');
  console.log('LocalStorage cleared successfully');
}
