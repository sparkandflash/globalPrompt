package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/database"
	"backend/middleware"
	"backend/models"
	"backend/utils"
)

func GetThreads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userId, ok := r.Context().Value(middleware.UserIDKey).(uint)
	if !ok || userId == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse query params
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page <= 0 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 {
		limit = 5
	}
	filter := r.URL.Query().Get("filter") // "created" or "followed"

	var threads []models.Thread
	query := database.DB.Model(&models.Thread{}).
		Joins("JOIN prompts ON prompts.id = threads.prompt_id AND prompts.deleted_at IS NULL").
		Joins("JOIN registries ON registries.id = prompts.registry_id AND registries.deleted_at IS NULL").
		Preload("Prompt").
		Preload("Prompt.User").
		Preload("Prompt.Registry").
		Preload("User").
		Preload("Comments")

	if filter == "created" {
		query = query.Where("threads.user_id = ?", userId)
	} else if filter == "followed" {
		// Show threads whose prompt belongs to a registry the user follows
		query = query.Joins("JOIN registry_followers ON registry_followers.registry_id = registries.id").
			Where("registry_followers.user_id = ?", userId)
	} else {
		// Default: show threads from registries the user follows
		query = query.Joins("JOIN registry_followers ON registry_followers.registry_id = registries.id").
			Where("registry_followers.user_id = ?", userId)
	}

	// Apply pagination
	offset := (page - 1) * limit
	if err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&threads).Error; err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Populate virtual field UserName
	for i := range threads {
		threads[i].UserName = threads[i].User.Username
		if threads[i].UserName == "" {
			threads[i].UserName = "Anonymous"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(threads)
}

func GetRecentThreads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userId, ok := r.Context().Value(middleware.UserIDKey).(uint)
	if !ok || userId == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	now := time.Now()
	// Start of day in local time
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var threads []models.Thread
	// Find threads where user has commented today
	// We join with comments and select distinct threads
	err := database.DB.Model(&models.Thread{}).
		Distinct("threads.*").
		Joins("JOIN comments ON comments.thread_id = threads.id").
		Where("comments.user_id = ? AND comments.created_at >= ? AND comments.deleted_at IS NULL", userId, startOfDay).
		Preload("Prompt").
		Order("threads.updated_at desc").
		Find(&threads).Error

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(threads)
}

func GetThreadDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Path[len("/threads/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	var thread models.Thread
	err = database.DB.Preload("Prompt").
		Preload("Prompt.User").
		Preload("Prompt.Registry").
		Preload("User").
		Preload("Comments").
		Preload("Comments.User").
		First(&thread, id).Error

	if err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	thread.UserName = thread.User.Username
	if thread.UserName == "" {
		thread.UserName = "Anonymous"
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(thread)
}

func GetPublicThread(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	idStr := r.URL.Path[len("/p/"):]
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	var thread models.Thread
	err = database.DB.Preload("Prompt").
		Preload("Prompt.User").
		Preload("Prompt.Registry").
		Preload("User").
		Preload("Comments").
		Preload("Comments.User").
		First(&thread, id).Error

	if err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	thread.UserName = thread.User.Username
	if thread.UserName == "" {
		thread.UserName = "Anonymous"
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(thread)
}

func SearchThreads(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	queryParam := r.URL.Query().Get("q")
	if queryParam == "" {
		http.Error(w, "Query parameter 'q' is required", http.StatusBadRequest)
		return
	}

	var threads []models.Thread
	err := database.DB.Model(&models.Thread{}).
		Joins("JOIN prompts ON prompts.id = threads.prompt_id AND prompts.deleted_at IS NULL").
		Joins("JOIN registries ON registries.id = prompts.registry_id AND registries.deleted_at IS NULL").
		Where("prompts.title ILIKE ?", "%"+queryParam+"%").
		Preload("Prompt").
		Preload("Prompt.User").
		Preload("Prompt.Registry").
		Preload("User").
		Preload("Comments").
		Find(&threads).Error

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for i := range threads {
		threads[i].UserName = threads[i].User.Username
		if threads[i].UserName == "" {
			threads[i].UserName = "Anonymous"
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(threads)
}

// Thread following has been removed. Registry following is the only supported follow mechanism.

func CreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userId, ok := r.Context().Value(middleware.UserIDKey).(uint)
	if !ok || userId == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Route could be /threads/:id/comments
	idStr := r.URL.Path[len("/threads/") : len(r.URL.Path)-len("/comments")]
	threadId, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	var reqBody struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var thread models.Thread
	if err := database.DB.First(&thread, threadId).Error; err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	comment := models.Comment{
		Content:  reqBody.Content,
		UserID:   userId,
		ThreadID: uint(threadId),
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		http.Error(w, "Failed to create comment", http.StatusInternalServerError)
		return
	}

	// Fetch with User preloaded to return full info
	database.DB.Preload("User").First(&comment, comment.ID)

	if thread.UserID != userId {
		username := comment.User.Username
		if username == "" {
			username = "Someone"
		}
		go utils.CreateNotification(thread.UserID, "reply", username+" replied to your thread.")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

func DeleteComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userId, ok := r.Context().Value(middleware.UserIDKey).(uint)
	if !ok || userId == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	pathParts := strings.Split(strings.TrimPrefix(r.URL.Path, "/threads/"), "/comments/")
	if len(pathParts) != 2 {
		http.Error(w, "Invalid comment route", http.StatusBadRequest)
		return
	}

	threadId, err := strconv.Atoi(pathParts[0])
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	commentId, err := strconv.Atoi(pathParts[1])
	if err != nil {
		http.Error(w, "Invalid comment ID", http.StatusBadRequest)
		return
	}

	var comment models.Comment
	if err := database.DB.
		Preload("Thread.Prompt").
		Where("thread_id = ?", threadId).
		First(&comment, commentId).Error; err != nil {
		http.Error(w, "Comment not found", http.StatusNotFound)
		return
	}

	isCommentAuthor := comment.UserID == userId
	isPromptAuthor := comment.Thread.Prompt.UserID == userId
	if !isCommentAuthor && !isPromptAuthor {
		http.Error(w, "Forbidden: You cannot delete this comment", http.StatusForbidden)
		return
	}

	if err := database.DB.Delete(&comment).Error; err != nil {
		http.Error(w, "Failed to delete comment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Comment deleted successfully"})
}

func UpdateThreadPrompt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userId, ok := r.Context().Value(middleware.UserIDKey).(uint)
	if !ok || userId == 0 {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	idStr := r.URL.Path[len("/threads/") : len(r.URL.Path)-len("/prompt")]
	threadId, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid thread ID", http.StatusBadRequest)
		return
	}

	var reqBody struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var thread models.Thread
	if err := database.DB.Preload("Prompt").First(&thread, threadId).Error; err != nil {
		http.Error(w, "Thread not found", http.StatusNotFound)
		return
	}

	if thread.UserID != userId {
		http.Error(w, "Forbidden: Only thread author can edit the prompt", http.StatusForbidden)
		return
	}

	thread.Prompt.Content = reqBody.Content
	if err := database.DB.Save(&thread.Prompt).Error; err != nil {
		http.Error(w, "Failed to update prompt content", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Prompt updated successfully"})
}
