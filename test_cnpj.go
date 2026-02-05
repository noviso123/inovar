package main

import (
	"encoding/json"
	"fmt"
)

type CNPJData struct {
	RegimeTributario interface{} `json:"regime_tributario"`
}

func main() {
	// Case 1: Array (The problematic case from the API)
	jsonArray := `{"regime_tributario": ["Simples Nacional"]}`
	var dataArray CNPJData
	err1 := json.Unmarshal([]byte(jsonArray), &dataArray)
	if err1 != nil {
		fmt.Printf("Case 1 (Array) Failed: %v\n", err1)
	} else {
		fmt.Printf("Case 1 (Array) Success: %v (Type: %T)\n", dataArray.RegimeTributario, dataArray.RegimeTributario)
	}

	// Case 2: String (Normal case)
	jsonString := `{"regime_tributario": "Simples Nacional"}`
	var dataString CNPJData
	err2 := json.Unmarshal([]byte(jsonString), &dataString)
	if err2 != nil {
		fmt.Printf("Case 2 (String) Failed: %v\n", err2)
	} else {
		fmt.Printf("Case 2 (String) Success: %v (Type: %T)\n", dataString.RegimeTributario, dataString.RegimeTributario)
	}
}
