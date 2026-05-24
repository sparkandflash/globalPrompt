package main

import (
	"backend/database"
	"backend/models"
	"backend/utils"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/pquerna/otp/totp"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("Usage: go run generate_totp.go <username>")
	}

	username := os.Args[1]

	// Load .env file
	if err := godotenv.Load(".env"); err != nil {
		log.Println("Note: No .env file found or failed to load, proceeding with env vars")
	}

	// Connect to Database
	database.Connect()

	var user models.User
	if result := database.DB.Where("username = ?", username).First(&user); result.Error != nil {
		log.Fatalf("User '%s' not found or database error: %v", username, result.Error)
	}

	// Generate new TOTP Secret
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      utils.ProjectName(),
		AccountName: user.Username,
	})
	if err != nil {
		log.Fatalf("Error generating TOTP secret: %v", err)
	}

	// Update user in database
	user.TOTPSecret = key.Secret()
	if result := database.DB.Save(&user); result.Error != nil {
		log.Fatalf("Error saving new TOTP secret to database: %v", result.Error)
	}

	fmt.Printf("\nSuccessfully generated new TOTP credentials for user: %s\n", user.Username)
	fmt.Printf("--------------------------------------------------\n")
	fmt.Printf("Secret Key: %s\n", key.Secret())
	fmt.Printf("Auth URL:   %s\n", key.URL())
	fmt.Printf("--------------------------------------------------\n")
}
