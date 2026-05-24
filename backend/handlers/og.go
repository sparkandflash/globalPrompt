package handlers

import (
	"fmt"
	"html"
	"net/http"
	"os"
	"strconv"
	"strings"

	"backend/database"
	"backend/models"
	"backend/utils"
)

func OGEmbed(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Path[len("/og/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}
	spaURL := fmt.Sprintf("%s/p/%d", frontendURL, id)

	// Real browsers: just redirect to the SPA
	if !utils.IsBot(r) {
		http.Redirect(w, r, spaURL, http.StatusFound)
		return
	}

	// Bots & AI Agents: fetch thread data and serve static HTML with OG tags + full content
	var thread models.Thread
	err = database.DB.Preload("Prompt").Preload("Prompt.Registry").Preload("User").First(&thread, id).Error
	if err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	title := thread.Prompt.Title
	projectName := utils.ProjectName()
	if title == "" {
		title = "Prompt on " + projectName
	}
	ogTitle := html.EscapeString(title + " — " + projectName)

	content := thread.Prompt.Content
	description := content
	if len(description) > 200 {
		description = description[:200] + "..."
	}
	ogDescription := html.EscapeString(strings.ReplaceAll(description, "\n", " "))

	author := thread.User.Username
	if author == "" {
		author = "Anonymous"
	}

	// Serve HTML page with full OG + Twitter card meta tags
	// For bots, we also include the full prompt content in a <pre> tag so they can "read" it.
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>%s</title>
  <meta property="og:type" content="article" />
  <meta property="og:title" content="%s" />
  <meta property="og:description" content="%s" />
  <meta property="og:url" content="%s" />
  <meta property="og:site_name" content="%s" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="%s" />
  <meta name="twitter:description" content="%s" />
  <meta name="author" content="%s" />
  <meta http-equiv="refresh" content="0; url=%s" />
  <style>
    body { font-family: sans-serif; line-height: 1.5; max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>%s</h1>
  <p>By <strong>%s</strong></p>
  <hr />
  <pre>%s</pre>
  <hr />
  <p>Redirecting to <a href="%s">interactive view</a>...</p>
</body>
</html>`,
		ogTitle,
		ogTitle, ogDescription, spaURL,
		html.EscapeString(projectName),
		ogTitle, ogDescription,
		html.EscapeString(author),
		spaURL,
		ogTitle, html.EscapeString(author), html.EscapeString(content), spaURL,
	)
}
