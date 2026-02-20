package services

import (
	"fmt"
	"inovar/internal/domain"
	"inovar/internal/infra/bridge"
	"inovar/internal/infra/config"
	"log"

	"gorm.io/gorm"
)

type EmailService struct {
	from        string
	frontendURL string
	db          *gorm.DB
}

func NewEmailService(cfg *config.Config, db *gorm.DB) *EmailService {
	return &EmailService{
		from:        cfg.SMTPUser,
		frontendURL: cfg.FrontendURL,
		db:          db,
	}
}

func (s *EmailService) send(to, subject, body string) error {
	_, err := bridge.CallPython("send_email", map[string]interface{}{
		"to":      to,
		"subject": subject,
		"body":    body,
	})
	if err != nil {
		log.Printf("⚠️ Email send failed to %s: %v", to, err)
	}
	return err
}

// getCompanySignature builds a dynamic HTML signature from the Prestador table
func (s *EmailService) getCompanySignature() string {
	var company domain.Prestador
	if err := s.db.First(&company).Error; err != nil {
		return `<div style="border-top: 2px solid #e2e8f0; margin-top: 30px; padding-top: 15px; font-size: 11px; color: #94a3b8;">
			<p><b>Inovar Gestão</b></p>
		</div>`
	}

	name := company.NomeFantasia
	if name == "" {
		name = company.RazaoSocial
	}

	logoHTML := ""
	if company.LogoURL != "" {
		logoHTML = fmt.Sprintf(`<img src="%s" alt="%s" style="max-width: 120px; max-height: 60px; margin-bottom: 8px;" />`, company.LogoURL, name)
	}

	contactInfo := ""
	if company.Phone != "" {
		contactInfo += fmt.Sprintf(`<span>📞 %s</span>`, company.Phone)
	}
	if company.Email != "" {
		if contactInfo != "" {
			contactInfo += " &nbsp;|&nbsp; "
		}
		contactInfo += fmt.Sprintf(`<span>📧 %s</span>`, company.Email)
	}

	cnpjLine := ""
	if company.CNPJ != "" {
		cnpjLine = fmt.Sprintf(`<p style="margin: 2px 0; font-size: 10px; color: #cbd5e1;">CNPJ: %s</p>`, company.CNPJ)
	}

	addressLine := ""
	if company.Address != "" {
		addressLine = fmt.Sprintf(`<p style="margin: 2px 0; font-size: 10px; color: #cbd5e1;">📍 %s</p>`, company.Address)
	}

	return fmt.Sprintf(`
		<div style="border-top: 2px solid #2563eb; margin-top: 30px; padding-top: 15px;">
			%s
			<p style="margin: 4px 0; font-size: 13px; font-weight: bold; color: #1e293b;">%s</p>
			%s
			%s
			<p style="margin: 4px 0; font-size: 11px; color: #64748b;">%s</p>
		</div>
	`, logoHTML, name, cnpjLine, addressLine, contactInfo)
}

func (s *EmailService) wrapEmail(content string) string {
	signature := s.getCompanySignature()
	return fmt.Sprintf(`
	<!DOCTYPE html>
	<html>
	<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif;">
		<div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
			<div style="padding: 30px;">
				%s
				%s
			</div>
		</div>
	</body>
	</html>`, content, signature)
}

// SendWelcomeEmail sends welcome email to newly created users with temp password
func (s *EmailService) SendWelcomeEmail(toEmail, userName, password string) error {
	content := fmt.Sprintf(`
		<h2 style="color: #2563eb; margin: 0 0 20px 0;">Bem-vindo ao Sistema! 🚀</h2>
		<p style="color: #334155;">Olá <b>%s</b>,</p>
		<p style="color: #334155;">Seu cadastro foi realizado com sucesso. Aqui estão suas credenciais de acesso:</p>
		<div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
			<p style="margin: 4px 0;"><b>📧 Email:</b> %s</p>
			<p style="margin: 4px 0;"><b>🔑 Senha temporária:</b> <code style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">%s</code></p>
		</div>
		<p style="color: #dc2626; font-size: 13px;">⚠️ Por segurança, altere sua senha após o primeiro acesso.</p>
		<div style="text-align: center; margin: 24px 0;">
			<a href="%s" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acessar o Sistema</a>
		</div>
	`, userName, toEmail, password, s.frontendURL)

	return s.send(toEmail, "Bem-vindo ao Sistema! 🚀", s.wrapEmail(content))
}

// SendPasswordResetByAdmin sends email when admin resets a user's password
func (s *EmailService) SendPasswordResetByAdmin(toEmail, userName, tempPassword string) error {
	content := fmt.Sprintf(`
		<h2 style="color: #f59e0b; margin: 0 0 20px 0;">Senha Redefinida pelo Administrador 🔑</h2>
		<p style="color: #334155;">Olá <b>%s</b>,</p>
		<p style="color: #334155;">Sua senha foi redefinida pelo administrador do sistema.</p>
		<div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #fbbf24;">
			<p style="margin: 4px 0;"><b>🔑 Nova senha temporária:</b> <code style="background: #fde68a; padding: 2px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">%s</code></p>
		</div>
		<p style="color: #dc2626; font-size: 13px;">⚠️ Você será solicitado a alterar esta senha no próximo acesso.</p>
		<div style="text-align: center; margin: 24px 0;">
			<a href="%s" style="background-color: #f59e0b; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acessar o Sistema</a>
		</div>
	`, userName, tempPassword, s.frontendURL)

	return s.send(toEmail, "Sua Senha foi Redefinida 🔑", s.wrapEmail(content))
}

// SendPasswordResetEmail sends email with password reset link
func (s *EmailService) SendPasswordResetEmail(toEmail, token, userName string) error {
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", s.frontendURL, token)

	content := fmt.Sprintf(`
		<h2 style="color: #dc2626; margin: 0 0 20px 0;">Redefinição de Senha 🔒</h2>
		<p style="color: #334155;">Olá <b>%s</b>,</p>
		<p style="color: #334155;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
		<div style="text-align: center; margin: 24px 0;">
			<a href="%s" style="background-color: #dc2626; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
		</div>
		<p style="font-size: 12px; color: #94a3b8;">Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este e-mail.</p>
	`, userName, resetLink)

	return s.send(toEmail, "Recuperação de Senha", s.wrapEmail(content))
}

// SendOSCreated sends notification when a new OS is opened
func (s *EmailService) SendOSCreated(toEmail, clientName, osNumber, description string) error {
	content := fmt.Sprintf(`
		<h2 style="color: #059669; margin: 0 0 20px 0;">Nova Ordem de Serviço Aberta 📋</h2>
		<p style="color: #334155;">Olá <b>%s</b>,</p>
		<p style="color: #334155;">Uma nova solicitação de serviço foi registrada:</p>
		<div style="background-color: #ecfdf5; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #6ee7b7;">
			<p style="margin: 4px 0;"><b>📋 Número:</b> #%s</p>
			<p style="margin: 4px 0;"><b>📝 Descrição:</b> %s</p>
		</div>
		<p style="color: #334155;">Você será notificado a cada atualização desta solicitação.</p>
	`, clientName, osNumber, description)

	return s.send(toEmail, fmt.Sprintf("Nova OS #%s Aberta", osNumber), s.wrapEmail(content))
}

// SendOSStatusUpdate sends notification when OS status changes
func (s *EmailService) SendOSStatusUpdate(toEmail, clientName, osNumber, oldStatus, newStatus string) error {
	statusColors := map[string]string{
		"EM_ANDAMENTO":    "#2563eb",
		"AGUARDANDO_PECA": "#f59e0b",
		"CONCLUIDA":       "#059669",
		"CANCELADA":       "#dc2626",
	}
	color := statusColors[newStatus]
	if color == "" {
		color = "#64748b"
	}

	content := fmt.Sprintf(`
		<h2 style="color: %s; margin: 0 0 20px 0;">Atualização da OS #%s</h2>
		<p style="color: #334155;">Olá <b>%s</b>,</p>
		<p style="color: #334155;">O status da sua Ordem de Serviço foi atualizado:</p>
		<div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
			<p style="margin: 4px 0;">De: <b>%s</b></p>
			<p style="margin: 4px 0;">Para: <span style="color: %s; font-weight: bold; font-size: 16px;">%s</span></p>
		</div>
	`, color, osNumber, clientName, oldStatus, color, newStatus)

	return s.send(toEmail, fmt.Sprintf("OS #%s - Status Atualizado", osNumber), s.wrapEmail(content))
}

// SendOSFinalized sends notification when OS is completed
func (s *EmailService) SendOSFinalized(toEmail, clientName, osNumber, pdfLink string) error {
	buttonHTML := ""
	if pdfLink != "" {
		buttonHTML = fmt.Sprintf(`
		<div style="text-align: center; margin: 24px 0;">
			<a href="%s" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver Relatório Completo</a>
		</div>`, pdfLink)
	}

	content := fmt.Sprintf(`
		<h2 style="color: #059669; margin: 0 0 20px 0;">Serviço Concluído! ✅</h2>
		<p style="color: #334155;">Olá <b>%s</b>,</p>
		<p style="color: #334155;">A Ordem de Serviço <b>#%s</b> foi finalizada com sucesso.</p>
		%s
		<p style="color: #334155; margin-top: 16px;">Obrigado pela confiança!</p>
	`, clientName, osNumber, buttonHTML)

	return s.send(toEmail, fmt.Sprintf("OS #%s Finalizada ✅", osNumber), s.wrapEmail(content))
}
