package utils

import "os"

func ProjectName() string {
	projectName := os.Getenv("PROJECT_NAME")
	if projectName == "" {
		return "ChalkBoard"
	}
	return projectName
}
