package main

import (
	"fmt"
	"io"
	"net/http"
)

func main() {
	token := "sbp_4327eaf47142310769e9e1a9f88030ab9085ec5d"
	ref := "bxbupbnjcingfvjszrau"
	url := fmt.Sprintf("https://api.supabase.com/v1/projects/%s/api-keys", ref)

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("%s\n", body)
}
