package main

import (
	"fmt"
	"inovar/internal/infra/bridge"
	"log"
	"os"
)

func main() {
	fmt.Println("🧪 Testing Smart Logo Processing...")

	// 1. Check if bridge is responsive
	resp, err := bridge.CallPython("lookup_cnpj", map[string]interface{}{"cnpj": "00000000000191"})
	if err != nil {
		log.Fatalf("❌ Bridge unresponsive: %v", err)
	}
	fmt.Println("✅ Bridge is responsive.")

	// 2. Test Logo Processing
	// We need a dummy image file.
	dummyPath := "test_logo_input.png"
	// Create a simple blank file if not exists (though rembg needs a real image,
	// but we just want to test the command execution path)
	err = os.WriteFile(dummyPath, []byte("fake image data"), 0644)
	// Note: rembg will fail on "fake image data", but we can cat the error.

	fmt.Println("\n📸 Testing process_logo action...")
	resp, err = bridge.CallPython("process_logo", map[string]interface{}{
		"file_path":  dummyPath,
		"company_id": "test-company-123",
	})

	if err != nil {
		fmt.Printf("⚠️ Bridge call path ok, but execution failed (as expected with fake data): %v\n", err)
	} else {
		fmt.Printf("Result: %+v\n", resp)
	}

	os.Remove(dummyPath)
}
