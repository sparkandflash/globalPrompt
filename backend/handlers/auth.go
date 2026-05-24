package handlers

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/pquerna/otp/totp"
)

type SignupRequest struct {
	Username string `json:"username"`
}

type LoginRequest struct {
	Username string `json:"username"`
	OTP      string `json:"otp"`
}

type AuthResponse struct {
	Token      string      `json:"token,omitempty"`
	User       models.User `json:"user,omitempty"`
	TOTPSecret string      `json:"totpSecret,omitempty"`
	OTPAuthURL string      `json:"otpAuthUrl,omitempty"`
}

func Signup(w http.ResponseWriter, r *http.Request) {
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.LogError("Invalid signup request body", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Generate TOTP Secret
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      utils.ProjectName(),
		AccountName: req.Username,
	})
	if err != nil {
		utils.LogError("Error generating TOTP secret", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	user := models.User{
		Username:   req.Username,
		TOTPSecret: key.Secret(),
		Role:       "default", // Default role
	}

	if result := database.DB.Create(&user); result.Error != nil {
		utils.LogError("Error creating user", result.Error)
		http.Error(w, "Error creating user (username might be taken)", http.StatusConflict)
		return
	}

	// We don't log them in directly or maybe we do, but here we just return the secret for setup
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{
		TOTPSecret: key.Secret(),
		OTPAuthURL: key.URL(), // Useful for QR code generation on the frontend
	})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.LogError("Invalid login request body", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	var user models.User
	if result := database.DB.Where("username = ?", req.Username).First(&user); result.Error != nil {
		utils.LogError("User not found or database error", result.Error)
		http.Error(w, "Invalid username or OTP", http.StatusUnauthorized)
		return
	}

	// Verify TOTP code
	valid := totp.Validate(req.OTP, user.TOTPSecret)
	if !valid {
		utils.LogError("Invalid OTP code", nil)
		http.Error(w, "Invalid username or OTP", http.StatusUnauthorized)
		return
	}

	// Generate JWT
	tokenString, err := generateJWT(user)
	if err != nil {
		utils.LogError("Error generating JWT", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AuthResponse{Token: tokenString, User: user})
}

func generateJWT(user models.User) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "default_secret_change_me" // Fallback
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(time.Hour * 24 * 30).Unix(), // 30 days
	})

	return token.SignedString([]byte(secret))
}
