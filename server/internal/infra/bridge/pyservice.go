package bridge

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"
)

var pyServiceURL string
var httpClient *http.Client

func init() {
	pyServiceURL = os.Getenv("PYSERVICE_URL")
	if pyServiceURL == "" {
		pyServiceURL = "http://localhost:8000"
	}
	httpClient = &http.Client{Timeout: 30 * time.Second}
}

// CallPyService makes an HTTP call to the Python data service
func CallPyService(method, path string, body interface{}) (map[string]interface{}, error) {
	url := pyServiceURL + path

	var reqBody io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}
		reqBody = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("python service call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w | raw: %s", err, string(respBody))
	}

	if resp.StatusCode >= 400 {
		detail := ""
		if d, ok := result["detail"]; ok {
			detail = fmt.Sprintf("%v", d)
		}
		return nil, fmt.Errorf("python service error %d: %s", resp.StatusCode, detail)
	}

	return result, nil
}

// CallPyServiceRaw returns the raw response body for streaming
func CallPyServiceRaw(method, path string, body interface{}) (*http.Response, error) {
	url := pyServiceURL + path

	var reqBody io.Reader
	if body != nil {
		jsonBytes, _ := json.Marshal(body)
		reqBody = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return httpClient.Do(req)
}

// UploadToPyService sends a file upload to Python service via multipart
func UploadToPyService(fieldName, fileName string, fileContent io.Reader) (map[string]interface{}, error) {
	url := pyServiceURL + "/db/uploads"

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile(fieldName, fileName)
	if err != nil {
		return nil, err
	}
	if _, err := io.Copy(part, fileContent); err != nil {
		return nil, err
	}
	writer.Close()

	req, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)
	return result, nil
}

// PyServiceHealthCheck checks if Python service is running
func PyServiceHealthCheck() bool {
	resp, err := httpClient.Get(pyServiceURL + "/db/health")
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}
