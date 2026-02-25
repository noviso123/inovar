package bridge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
)

// BridgeRequest defines the structure for calling Python functions
type BridgeRequest struct {
	Action string                 `json:"action"`
	Params map[string]interface{} `json:"params"`
}

// BridgeResponse defines the structure for receiving Python output
type BridgeResponse struct {
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data"`
	Error   string                 `json:"error"`
}

// CallPython calls the Python bridge script with the given action and parameters
func CallPython(action string, params map[string]interface{}) (*BridgeResponse, error) {
	req := BridgeRequest{
		Action: action,
		Params: params,
	}

	payload, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal bridge request: %w", err)
	}

	// Determine the bridge script path based on environment
	// In Docker: /app/infra/scripts/bridge.py
	// In local dev: ../infra/scripts/bridge.py
	bridgePath := os.Getenv("BRIDGE_SCRIPT_PATH")
	if bridgePath == "" {
		bridgePath = "../infra/scripts/bridge.py"
	}

	pythonCmd := os.Getenv("PYTHON_CMD")
	if pythonCmd == "" {
		pythonCmd = "python" // Default to python for Windows/General
	}

	cmd := exec.Command(pythonCmd, bridgePath, string(payload))

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil {
		return nil, fmt.Errorf("python bridge execution failed: %v | stderr: %s", err, stderr.String())
	}

	var resp BridgeResponse
	if err := json.Unmarshal(stdout.Bytes(), &resp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal bridge response: %w | raw: %s", err, stdout.String())
	}

	if !resp.Success {
		return nil, fmt.Errorf("python bridge error: %s", resp.Error)
	}

	return &resp, nil
}
