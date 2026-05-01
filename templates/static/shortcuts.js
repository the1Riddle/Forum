// Keyboard shortcuts
class KeyboardShortcuts {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K - Focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector('input[type="search"]')?.focus();
                this.showHint('Search focused');
            }
            
            // Ctrl/Cmd + N - New post
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                document.getElementById('createPostForm')?.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('postTitle')?.focus();
                this.showHint('Creating new post');
            }
            
            // ? - Show shortcuts help
            if (e.key === '?') {
                this.showHelpModal();
            }
            
            // J/K - Navigate posts
            if (e.key === 'j') {
                this.navigatePosts('next');
            }
            if (e.key === 'k') {
                this.navigatePosts('prev');
            }
            
            // R - Reply to last post
            if (e.key === 'r') {
                const lastPost = document.querySelector('.post-card:last-child');
                lastPost?.querySelector('.comment-input')?.focus();
            }
        });
    }

    showHint(message) {
        const hint = document.createElement('div');
        hint.className = 'fixed bottom-20 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm z-50';
        hint.textContent = `⌨️ ${message}`;
        document.body.appendChild(hint);
        setTimeout(() => hint.remove(), 1500);
    }

    showHelpModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl p-8 max-w-md">
                <h2 class="text-2xl font-bold mb-4">⌨️ Keyboard Shortcuts</h2>
                <div class="space-y-3">
                    <div class="flex justify-between"><span><kbd class="px-2 py-1 bg-gray-200 rounded">Ctrl+K</kbd></span><span>Focus search</span></div>
                    <div class="flex justify-between"><span><kbd class="px-2 py-1 bg-gray-200 rounded">Ctrl+N</kbd></span><span>New post</span></div>
                    <div class="flex justify-between"><span><kbd class="px-2 py-1 bg-gray-200 rounded">J</kbd>/<kbd>K</kbd></span><span>Navigate posts</span></div>
                    <div class="flex justify-between"><span><kbd class="px-2 py-1 bg-gray-200 rounded">R</kbd></span><span>Reply to post</span></div>
                    <div class="flex justify-between"><span><kbd class="px-2 py-1 bg-gray-200 rounded">?</kbd></span><span>Show this help</span></div>
                </div>
                <button class="mt-6 w-full bg-sky-500 text-white py-2 rounded-lg">Got it</button>
            </div>
        `;
        modal.querySelector('button').onclick = () => modal.remove();
        document.body.appendChild(modal);
    }

    navigatePosts(direction) {
        const posts = document.querySelectorAll('.post-card');
        if (posts.length === 0) return;
        
        const currentIndex = Array.from(posts).findIndex(p => p.classList.contains('focused'));
        let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        
        if (newIndex >= 0 && newIndex < posts.length) {
            posts[currentIndex]?.classList.remove('focused');
            posts[newIndex].classList.add('focused', 'ring-2', 'ring-sky-500');
            posts[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

new KeyboardShortcuts();