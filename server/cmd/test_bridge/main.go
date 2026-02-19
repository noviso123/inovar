package main

import (
	"encoding/json"
	"fmt"
	"inovar/internal/infra/bridge"
	"log"
)

func main() {
	fmt.Println("Testing Go-Python Bridge...")

	// Test a simple action: calculate_taxes (no external dep)
	params := map[string]interface{}{
		"valor_servicos": 1000.0,
		"valor_deducoes": 0.0,
		"config": map[string]interface{}{
			"regime_tributario": "SIMPLES_NACIONAL",
			"faixa_simples_nac": "FAIXA_1",
		},
	}

	fmt.Println("Calling Python bridge (calculate_taxes)...")
	resp, err := bridge.CallPython("calculate_taxes", params)
	if err != nil {
		log.Fatalf("Bridge Error: %v", err)
	}

	pretty, _ := json.MarshalIndent(resp, "", "  ")
	fmt.Printf("Bridge Response:\n%s\n", string(pretty))

	// Test email bridge (it will queue if no SMTP env)
	fmt.Println("\nCalling Python bridge (send_email)...")
	emailParams := map[string]interface{}{
		"to":      "test-go@example.com",
		"subject": "Test from Go Bridge",
		"body":    "<h1>Hello from Go!</h1>",
	}
	respEmail, err := bridge.CallPython("send_email", emailParams)
	if err != nil {
		fmt.Printf("Email Bridge Warning (Expected if SMTP fails): %v\n", err)
	} else {
		fmt.Printf("Email Bridge Response: %v (Queued: %v)\n", respEmail.Success, respEmail.Data["queued"])
	}

	fmt.Println("\nBridge Validation Complete.")
}
