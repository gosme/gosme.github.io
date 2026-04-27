# Developer Portfolio Template

A dynamic, fully-responsive portfolio website designed specifically for GitHub Pages. 

This website uses standard web technologies (HTML, CSS, JS) but is designed to load its textual content dynamically from a structured JSON file. This architecture makes it incredibly easy to update your projects, experience, and contact info without ever having to touch the HTML layout!

## 🚀 Quick Start: How to Use This Template

Follow these steps to personalize this portfolio and host it for free on your own GitHub account:

### 1. Clone or Download
Clone this repository to your local machine:
```bash
git clone https://github.com/gosme/gosme.github.io.git
```
*(Alternatively, you can just click the "Code" button and "Download ZIP" on GitHub, or fork this repository).*

### 2. Personalize Your Content
You don't need to touch the HTML! All the text on the website is powered by a single file.
1. Open `resources/data.json` in any text editor.
2. Replace the placeholder text, projects, timeline items, and links with your own information.
3. Update the images in the `images/` directory. Make sure to keep the filenames the same, or update the references in `data.json` and `index.html` accordingly.
4. If you want background music, replace `resources/music.mp3` with your own audio file.
5. If you want to change the theme, update the `theme` object in `resources/data.json`.

### 3. Test Locally
Because the site uses the `fetch()` API to load `data.json` dynamically, **you cannot simply double-click `index.html` to view it locally**. Modern browsers block local file fetching for security reasons (CORS).

To view the site locally:
- **VS Code:** Install the "Live Server" extension and click "Go Live" in the bottom right corner.
- **Python:** Run `python -m http.server` in your terminal from the project root folder, then open `http://localhost:8000` in your browser.

### 4. Go Live on GitHub Pages
To host this for free at `yourusername.github.io`:
1. Go to your GitHub account and create a new repository named exactly **`yourusername.github.io`** (replace `yourusername` with your actual GitHub username).
2. Initialize the repository locally and push your customized files to it:
   ```bash
   # Remove the old git history if you cloned it
   rm -rf .git
   
   # Initialize your new repository
   git init
   git add .
   git commit -m "Initial portfolio commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/yourusername.github.io.git
   git push -u origin main
   ```
3. In your new repository on GitHub, go to **Settings > Pages**, ensure the source is set to deploy from the `main` branch.
4. Your site will be published at `https://yourusername.github.io`! It might take a minute or two to build and go live.

---

## 📁 File Structure

- `index.html`: The structural template. It contains the layout and IDs for dynamic data binding, but no hardcoded text.
- `resources/data.json`: The single source of truth for all content. Edit this file to update the site.
- `styles.css`: Contains the full visual design, responsive layout, and animations.
- `script.js`: Handles fetching the data from `data.json`, injecting it into the DOM, and initializing interactive elements (like the welcome banner, scroll animations, and video modals).
