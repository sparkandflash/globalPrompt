package handlers

import (
	"fmt"
	"html"
	"html/template"
	"net/http"
	"os"
	"strconv"
	"strings"

	"backend/database"
	"backend/models"
	"backend/utils"
)

type SEOPageData struct {
	Title       string
	RawTitle    string
	Description string
	Author      string
	Content     string
	SEOURL      string
	AppURL      string
	AppName     string
}

func SEOThreadView(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Assuming path is like /123
	path := strings.TrimPrefix(r.URL.Path, "/")
	id, err := strconv.Atoi(path)
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://chalkboard.cc"
	}
	appURL := fmt.Sprintf("%s/p/%d", frontendURL, id)

	// If human, redirect immediately to the interactive app
	if !utils.IsBot(r) {
		http.Redirect(w, r, appURL, http.StatusFound)
		return
	}

	// It's a bot! Fetch real data.
	var thread models.Thread
	err = database.DB.Preload("Prompt").Preload("User").First(&thread, id).Error
	if err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	rawTitle := thread.Prompt.Title
	projectName := utils.ProjectName()
	if rawTitle == "" {
		rawTitle = "Prompt"
	}
	title := html.EscapeString(rawTitle + " — " + projectName)

	content := thread.Prompt.Content

	description := content
	if len(description) > 200 {
		description = description[:200] + "..."
	}
	description = html.EscapeString(strings.ReplaceAll(description, "\n", " "))

	author := thread.User.Username
	if author == "" {
		author = "Anonymous"
	}

	data := SEOPageData{
		Title:       title,
		RawTitle:    html.EscapeString(rawTitle),
		Description: description,
		Author:      html.EscapeString(author),
		Content:     html.EscapeString(content),
		SEOURL:      fmt.Sprintf("https://prompts.chalkboard.cc/%d", id),
		AppURL:      appURL,
		AppName:     html.EscapeString(projectName),
	}

	tmpl, err := template.ParseFiles("templates/seo_thread.html")
	if err != nil {
		http.Error(w, "Template error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	tmpl.Execute(w, data)
}

func SEOSitemap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var threads []models.Thread
	// Fetch all threads. Usually you'd paginate this or limit to public ones.
	err := database.DB.Find(&threads).Error
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/xml")
	fmt.Fprintf(w, `<?xml version="1.0" encoding="UTF-8"?>`+"\n")
	fmt.Fprintf(w, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`+"\n")

	for _, thread := range threads {
		fmt.Fprintf(w, "  <url>\n")
		fmt.Fprintf(w, "    <loc>https://prompts.chalkboard.cc/%d</loc>\n", thread.ID)
		fmt.Fprintf(w, "    <changefreq>weekly</changefreq>\n")
		fmt.Fprintf(w, "  </url>\n")
	}

	fmt.Fprintf(w, `</urlset>`)
}
