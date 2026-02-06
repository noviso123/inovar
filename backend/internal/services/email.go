package services

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"

	"github.com/inovar/backend/internal/config"
)

// EmailService handles sending emails via SMTP
type EmailService struct {
	config *config.Config
}

// NewEmailService creates a new EmailService instance
func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{config: cfg}
}

// IsConfigured checks if SMTP is properly configured
func (e *EmailService) IsConfigured() bool {
	return e.config.SMTPHost != "" && e.config.SMTPUser != "" && e.config.SMTPPassword != ""
}

// SendEmail sends an email using SMTP
func (e *EmailService) SendEmail(to, subject, body string) error {
	if !e.IsConfigured() {
		log.Println("⚠️ Email não enviado: SMTP não configurado")
		return nil // Silent fail in development
	}

	from := e.config.SMTPFrom
	smtpHost := e.config.SMTPHost
	smtpPort := e.config.SMTPPort

	// Message headers
	headers := make(map[string]string)
	headers["From"] = from
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	// Build message
	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	// Auth
	auth := smtp.PlainAuth("", e.config.SMTPUser, e.config.SMTPPassword, smtpHost)

	// TLS config
	tlsConfig := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         smtpHost,
	}

	// Connect with TLS
	conn, err := tls.Dial("tcp", fmt.Sprintf("%s:%d", smtpHost, smtpPort), tlsConfig)
	if err != nil {
		// Try without TLS for port 587
		if smtpPort == 587 {
			return smtp.SendMail(
				fmt.Sprintf("%s:%d", smtpHost, smtpPort),
				auth,
				from,
				[]string{to},
				[]byte(message),
			)
		}
		return fmt.Errorf("falha ao conectar SMTP: %v", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return fmt.Errorf("falha ao criar cliente SMTP: %v", err)
	}

	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("falha na autenticação SMTP: %v", err)
	}

	if err = client.Mail(from); err != nil {
		return fmt.Errorf("falha no comando MAIL: %v", err)
	}

	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("falha no comando RCPT: %v", err)
	}

	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("falha no comando DATA: %v", err)
	}

	_, err = w.Write([]byte(message))
	if err != nil {
		return fmt.Errorf("falha ao escrever mensagem: %v", err)
	}

	err = w.Close()
	if err != nil {
		return fmt.Errorf("falha ao fechar writer: %v", err)
	}

	client.Quit()

	log.Printf("✅ Email enviado para: %s", to)
	return nil
}

// SendPasswordResetEmail sends a password reset email
func (e *EmailService) SendPasswordResetEmail(toEmail, token, userName string) error {
	// Get frontend URL from environment or use default
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	subject := "Inovar - Recuperação de Senha"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Inovar Gestão</h1>
        </div>
        <div class="content">
            <h2>Olá, %s!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <p style="text-align: center;">
                <a href="%s" class="button">Redefinir Senha</a>
            </p>
            <div class="warning">
                ⚠️ Este link expira em <strong>1 hora</strong>. Se você não solicitou esta recuperação, ignore este email.
            </div>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p style="word-break: break-all; color: #2563eb;">%s</p>
        </div>
        <div class="footer">
            <p>© 2025 Inovar - Todos os direitos reservados</p>
            <p>Este é um email automático, não responda.</p>
        </div>
    </div>
</body>
</html>
`, userName, resetLink, resetLink)

	return e.SendEmail(toEmail, subject, body)
}

// SendWelcomeEmail sends a welcome email to new users
func (e *EmailService) SendWelcomeEmail(toEmail, userName, tempPassword string) error {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	subject := "Bem-vindo ao Inovar!"
	body := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .credentials { background: #dbeafe; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Inovar Gestão</h1>
        </div>
        <div class="content">
            <h2>Bem-vindo(a), %s! 🎉</h2>
            <p>Sua conta foi criada com sucesso no sistema Inovar.</p>
            <div class="credentials">
                <p><strong>Email:</strong> %s</p>
                <p><strong>Senha temporária:</strong> %s</p>
            </div>
            <p style="text-align: center;">
                <a href="%s/login" class="button">Acessar Sistema</a>
            </p>
            <p>⚠️ Por segurança, altere sua senha no primeiro acesso.</p>
        </div>
        <div class="footer">
            <p>© 2025 Inovar Gestão - Todos os direitos reservados</p>
        </div>
    </div>
</body>
</html>
`, userName, toEmail, tempPassword, frontendURL)

	// If password provided, show it, otherwise just welcome
	if tempPassword == "" {
		body = strings.Replace(body, `<p><strong>Senha temporária:</strong> </p>`, "", 1)
	}

	return e.SendEmail(toEmail, subject, body)
}
