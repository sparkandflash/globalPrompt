package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/rs/cors"

	"backend/database"
	"backend/handlers"
	"backend/middleware"
	"backend/models"
	"backend/utils"
)

type LoginRequest struct {
	Token string `json:"token"`
}

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize Logging
	utils.InitLogging()

	// Connect to Database
	database.Connect()
	// Auto Migrate
	database.DB.AutoMigrate(&models.User{}, &models.Registry{}, &models.Prompt{}, &models.Thread{}, &models.Comment{}, &models.Notification{})

	// Start Background Jobs
	utils.StartNotificationPurgeJob()
	mux := http.NewServeMux()

	// Auth Handlers
	mux.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
		middleware.LoggingMiddleware(http.HandlerFunc(handlers.Signup)).ServeHTTP(w, r)
	})
	mux.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		middleware.LoggingMiddleware(http.HandlerFunc(handlers.Login)).ServeHTTP(w, r)
	})

	// Registry Handlers
	mux.HandleFunc("/registries", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				handlers.GetUserRegistries(w, r)
				return
			}
			if r.Method == http.MethodPost {
				handlers.CreateRegistry(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/registries/", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			pathLen := len(r.URL.Path)
			if r.Method == http.MethodDelete && pathLen > len("/registries/") && r.URL.Path[pathLen-7:] != "/follow" {
				handlers.DeleteRegistry(w, r)
				return
			}
			if r.Method == http.MethodPost && pathLen > len("/follow") && r.URL.Path[pathLen-7:] == "/follow" {
				handlers.ToggleFollowRegistry(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	// Prompt Handlers
	mux.HandleFunc("/prompts", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				handlers.GetPrompts(w, r) // Public?
				return
			}
			if r.Method == http.MethodPost {
				middleware.AuthMiddleware(http.HandlerFunc(handlers.CreatePrompt)).ServeHTTP(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(handler).ServeHTTP(w, r)
	})

	mux.HandleFunc("/prompts/", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodDelete {
				handlers.DeletePrompt(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	// Thread Handlers
	mux.HandleFunc("/threads", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				handlers.GetThreads(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	// User Profile Handlers
	mux.HandleFunc("/profile/metrics", func(w http.ResponseWriter, r *http.Request) {
		middleware.LoggingMiddleware(middleware.AuthMiddleware(http.HandlerFunc(handlers.GetUserMetrics))).ServeHTTP(w, r)
	})

	// Notification Handlers
	mux.HandleFunc("/notifications", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				handlers.GetNotifications(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/notifications/", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			pathLen := len(r.URL.Path)
			if r.Method == http.MethodPut && pathLen > 5 && r.URL.Path[pathLen-5:] == "/read" {
				handlers.MarkNotificationRead(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	mux.HandleFunc("/threads/search", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				handlers.SearchThreads(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(handler).ServeHTTP(w, r) // Public: no auth required
	})

	// Individual Thread Detail route (e.g., /threads/1)
	mux.HandleFunc("/threads/", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			pathLen := len(r.URL.Path)

			// Exact match for /threads/{id}
			if r.Method == http.MethodGet && pathLen > len("/threads/") && r.URL.Path[pathLen-9:] != "/comments" && r.URL.Path[pathLen-7:] != "/prompt" {
				handlers.GetThreadDetail(w, r)
				return
			}

			// Match for /threads/{id}/comments
			if r.Method == http.MethodPost && pathLen > len("/comments") && r.URL.Path[pathLen-9:] == "/comments" {
				handlers.CreateComment(w, r)
				return
			}

			// Match for /threads/{id}/comments/{commentId}
			if r.Method == http.MethodDelete && strings.Contains(r.URL.Path, "/comments/") {
				handlers.DeleteComment(w, r)
				return
			}

			// Match for /threads/{id}/prompt
			if r.Method == http.MethodPut && pathLen > len("/prompt") && r.URL.Path[pathLen-7:] == "/prompt" {
				handlers.UpdateThreadPrompt(w, r)
				return
			}

			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	// Public thread view (no auth required)
	mux.HandleFunc("/p/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			middleware.LoggingMiddleware(http.HandlerFunc(handlers.GetPublicThread)).ServeHTTP(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// OG embed endpoint — serves static HTML with OG meta tags for bots (Discord, Slack, etc.)
	// Real browsers are redirected to the SPA's /p/:id
	mux.HandleFunc("/og/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			middleware.LoggingMiddleware(http.HandlerFunc(handlers.OGEmbed)).ServeHTTP(w, r)
			return
		}
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	mux.HandleFunc("/recent-threads", func(w http.ResponseWriter, r *http.Request) {
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				handlers.GetRecentThreads(w, r)
				return
			}
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		})
		middleware.LoggingMiddleware(middleware.AuthMiddleware(handler)).ServeHTTP(w, r)
	})

	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:5173"}
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}

	// Add CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	})

	seoMux := http.NewServeMux()
	seoMux.HandleFunc("/sitemap.xml", func(w http.ResponseWriter, r *http.Request) {
		middleware.LoggingMiddleware(http.HandlerFunc(handlers.SEOSitemap)).ServeHTTP(w, r)
	})
	seoMux.HandleFunc("/robots.xml", func(w http.ResponseWriter, r *http.Request) {
		// Just in case someone typos it
		http.Redirect(w, r, "/sitemap.xml", http.StatusMovedPermanently)
	})
	seoMux.HandleFunc("/robots.txt", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "User-agent: *\nAllow: /\nSitemap: https://prompts.chalkboard.cc/sitemap.xml\n")
	})
	seoMux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Ignore favicon etc
		if r.URL.Path == "/favicon.ico" || r.URL.Path == "/" {
			http.NotFound(w, r)
			return
		}
		middleware.LoggingMiddleware(http.HandlerFunc(handlers.SEOThreadView)).ServeHTTP(w, r)
	})

	apiHandler := c.Handler(mux)

	mainHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host := r.Host
		if strings.HasPrefix(host, "prompts.chalkboard.cc") {
			seoMux.ServeHTTP(w, r)
			return
		}
		apiHandler.ServeHTTP(w, r)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	utils.LogInfo("Server starting on :" + port + "...")
	if err := http.ListenAndServe(":"+port, mainHandler); err != nil {
		utils.LogError("Error starting server", err)
	}
}
