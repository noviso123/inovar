package main

import (
	"fmt"
	"inovar/internal/infra/bridge"
	"log"
)

func main() {
	targetEmail := "jtsatiro@hotmail.com"
	fmt.Printf("🧪 Starting Complete E-mail Flow Validation for: %s\n", targetEmail)

	flows := []struct {
		name   string
		action string
		params map[string]interface{}
	}{
		{
			name:   "1. Welcome Email (New User/Client)",
			action: "send_email",
			params: map[string]interface{}{
				"to":      targetEmail,
				"subject": "Boas-vindas ao Inovar Gestão! 🚀",
				"body":    "<h1>Olá, Teste!</h1><p>Seu cadastro foi realizado com sucesso.</p><p>Usuário: " + targetEmail + "<br>Senha: 123456</p>",
			},
		},
		{
			name:   "2. Password Reset Request",
			action: "send_email",
			params: map[string]interface{}{
				"to":      targetEmail,
				"subject": "Recuperação de Senha - Inovar",
				"body":    "<h1>Redefinição de Senha</h1><p>Clique no link para resetar: <a href='http://localhost:3000/reset'>Resetar Senha</a></p>",
			},
		},
		{
			name:   "3. New OS Created",
			action: "send_email",
			params: map[string]interface{}{
				"to":      targetEmail,
				"subject": "Nova Ordem de Serviço #1234 Aberta",
				"body":    "<h1>Nova OS #1234</h1><p>Um novo chamado foi aberto para você: <b>Manutenção Corretiva de Ar Condicionado</b></p>",
			},
		},
		{
			name:   "4. OS Finalized",
			action: "send_email",
			params: map[string]interface{}{
				"to":      targetEmail,
				"subject": "OS #1234 Finalizada - Inovar Gestão ✅",
				"body":    "<h1>Serviço Concluído!</h1><p>A OS #1234 foi finalizada. <a href='http://localhost:3000/chamados/123'>Clique aqui para ver o laudo.</a></p>",
			},
		},
	}

	for _, flow := range flows {
		fmt.Printf("\n📡 Processing Flow: %s\n", flow.name)
		resp, err := bridge.CallPython(flow.action, flow.params)
		if err != nil {
			log.Printf("❌ Error in flow %s: %v", flow.name, err)
			continue
		}
		if resp.Success {
			queued, _ := resp.Data["queued"].(bool)
			if queued {
				fmt.Printf("📥 Flow %s: QUEUED (SMTP failure, check queue folder)\n", flow.name)
			} else {
				fmt.Printf("✅ Flow %s: SENT SUCCESSFULLY!\n", flow.name)
			}
		} else {
			fmt.Printf("❌ Flow %s FAILED: %v\n", flow.name, resp.Error)
		}
	}

	fmt.Println("\n✨ Comprehensive Validation Complete.")
}
