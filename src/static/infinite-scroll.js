// Infinite scroll for posts
class InfiniteScroll {
    constructor(loadMoreCallback) {
        this.page = 1;
        this.loading = false;
        this.hasMore = true;
        this.loadMoreCallback = loadMoreCallback;
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            if (this.loading || !this.hasMore) return;
            
            const scrollPosition = window.innerHeight + window.scrollY;
            const threshold = document.body.offsetHeight - 500;
            
            if (scrollPosition >= threshold) {
                this.loadMore();
            }
        });
    }

    async loadMore() {
        this.loading = true;
        this.showLoader();
        
        this.page++;
        const result = await this.loadMoreCallback(this.page);
        
        if (!result || result.length === 0) {
            this.hasMore = false;
            this.showEndMessage();
        }
        
        this.hideLoader();
        this.loading = false;
    }

    showLoader() {
        let loader = document.getElementById('scroll-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'scroll-loader';
            loader.className = 'text-center py-8';
            loader.innerHTML = `
                <div class="inline-flex items-center gap-2">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
                    <span>Loading more posts...</span>
                </div>
            `;
            document.querySelector('.posts-grid').after(loader);
        }
    }

    hideLoader() {
        const loader = document.getElementById('scroll-loader');
        if (loader) loader.remove();
    }

    showEndMessage() {
        const endMsg = document.createElement('div');
        endMsg.className = 'text-center py-8 text-gray-500';
        endMsg.innerHTML = '✨ You\'ve reached the end ✨';
        document.querySelector('.posts-grid').after(endMsg);
    }
}

// Usage
const infiniteScroll = new InfiniteScroll(async (page) => {
    const response = await fetch(`/api/posts?page=${page}`);
    const posts = await response.json();
    appendPosts(posts);
    return posts;
});